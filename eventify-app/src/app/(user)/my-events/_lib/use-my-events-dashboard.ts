"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import type { UserDashboardEvent, EventReviewStatus, EventApplicationRow, OrganizerRequest } from "./types"
import type { OrganizerRatingSummaries } from "./organizer-display"
import { MY_EVENTS_API_BASE } from "./types"

export function useMyEventsDashboard() {
    const [events, setEvents] = useState<UserDashboardEvent[]>([])
    const [organizerRequests, setOrganizerRequests] = useState<OrganizerRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [applicationsModalEventId, setApplicationsModalEventId] = useState<number | null>(null)
    const [applications, setApplications] = useState<EventApplicationRow[]>([])
    const [loadingApplications, setLoadingApplications] = useState(false)
    const [assigningOrganizerId, setAssigningOrganizerId] = useState<number | null>(null)
    const [decliningOrganizerId, setDecliningOrganizerId] = useState<number | null>(null)
    const [applicationOrganizerSummaries, setApplicationOrganizerSummaries] = useState<OrganizerRatingSummaries>({})
    const [reviewStatusByEvent, setReviewStatusByEvent] = useState<Record<number, EventReviewStatus>>({})
    const [reviewDialog, setReviewDialog] = useState<{
        eventId: number
        organizerId: number
        organizerName: string
    } | null>(null)

    const appCountByEventRef = useRef<Record<number, number>>({})
    const hasSeededAppCountsRef = useRef(false)

    const fetchReviewStatuses = useCallback(async (eventList: UserDashboardEvent[]) => {
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) return
        const targets = eventList.filter(
            (e) =>
                e.status === "completed" &&
                e.organizer_status === "accepted" &&
                e.organizer_id != null
        )
        if (targets.length === 0) {
            setReviewStatusByEvent({})
            return
        }
        const results = await Promise.all(
            targets.map(async (e) => {
                try {
                    const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${e.id}/review-status`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (!res.ok) return [e.id, null] as const
                    const data = await res.json()
                    return [
                        e.id,
                        {
                            can_review_organizer: !!data.can_review_organizer,
                            my_user_to_organizer: data.my_user_to_organizer,
                        },
                    ] as const
                } catch {
                    return [e.id, null] as const
                }
            })
        )
        const next: Record<number, EventReviewStatus> = {}
        for (const [id, row] of results) {
            if (row) next[id] = row
        }
        setReviewStatusByEvent(next)
    }, [])

    const loadApplicationOrganizerSummaries = useCallback(async (rows: EventApplicationRow[]) => {
        const ids = [...new Set(rows.map((r) => r.organizer_id).filter((id): id is number => Number.isFinite(id)))]
        if (!ids.length) {
            setApplicationOrganizerSummaries({})
            return
        }
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) return
        try {
            const res = await fetch(`${MY_EVENTS_API_BASE}/api/users/rating-summaries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_ids: ids }),
            })
            if (!res.ok) return
            const data = await res.json()
            const summaries = data.summaries || {}
            const map: OrganizerRatingSummaries = {}
            for (const key of Object.keys(summaries)) {
                map[Number(key)] = summaries[key]
            }
            setApplicationOrganizerSummaries(map)
        } catch {
            setApplicationOrganizerSummaries({})
        }
    }, [])

    const reloadApplications = useCallback(
        async (eventId: number) => {
            setLoadingApplications(true)
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            try {
                const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${eventId}/applications`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    const list = Array.isArray(data) ? data : []
                    setApplications(list)
                    void loadApplicationOrganizerSummaries(list)
                } else {
                    toast.error("Failed to load applications")
                }
            } catch {
                toast.error("Failed to load applications")
            } finally {
                setLoadingApplications(false)
            }
        },
        [loadApplicationOrganizerSummaries]
    )

    const openApplicationsModal = useCallback(
        async (eventId: number) => {
            setApplicationsModalEventId(eventId)
            setApplications([])
            setApplicationOrganizerSummaries({})
            await reloadApplications(eventId)
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            if (token) {
                void fetch(`${MY_EVENTS_API_BASE}/api/payments/notifications/mark-read-by-action`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ action: "view_applications", event_id: eventId }),
                })
                    .then((r) => {
                        if (r.ok && typeof window !== "undefined") {
                            window.dispatchEvent(new Event("refresh-notifications"))
                        }
                    })
                    .catch(() => {})
            }
        },
        [reloadApplications]
    )

    const fetchEvents = useCallback(
        async (opts?: { silent?: boolean }): Promise<UserDashboardEvent[]> => {
            const silent = opts?.silent
            if (!silent) setLoading(true)
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            if (!token) {
                if (!silent) setLoading(false)
                return []
            }
            let created: UserDashboardEvent[] = []
            try {
                const [eventsRes, requestsRes] = await Promise.all([
                    fetch(`${MY_EVENTS_API_BASE}/api/events`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${MY_EVENTS_API_BASE}/api/payments/organizer-requests`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])
                if (eventsRes.ok) {
                    const data = await eventsRes.json()
                    const raw = data.created || []
                    created = [...raw].sort((a: UserDashboardEvent, b: UserDashboardEvent) => b.id - a.id)
                    if (silent && hasSeededAppCountsRef.current) {
                        let anyNew = false
                        for (const e of created) {
                            const next = e.application_count ?? 0
                            const prev = appCountByEventRef.current[e.id] ?? 0
                            if (next > prev) {
                                anyNew = true
                                const name = (e as UserDashboardEvent).name || "Event"
                                toast.info(`New application for "${name}"`, {
                                    action: {
                                        label: "View",
                                        onClick: () => {
                                            void openApplicationsModal(e.id)
                                        },
                                    },
                                })
                            }
                        }
                        if (anyNew && typeof window !== "undefined") {
                            window.dispatchEvent(new Event("refresh-notifications"))
                        }
                    }
                    for (const e of created) {
                        appCountByEventRef.current[e.id] = e.application_count ?? 0
                    }
                    hasSeededAppCountsRef.current = true
                    setEvents(created)
                } else if (!silent) {
                    toast.error("Failed to load your events")
                }
                if (requestsRes.ok) {
                    const reqData = await requestsRes.json()
                    setOrganizerRequests(reqData.organizer_requests || [])
                }
            } catch (err) {
                console.error("Fetch error:", err)
                if (!silent) toast.error("Internal service error")
            } finally {
                if (!silent) setLoading(false)
            }
            return created
        },
        [openApplicationsModal],
    )

    useEffect(() => {
        void fetchEvents()
    }, [fetchEvents])

    useEffect(() => {
        const t = setInterval(() => {
            void fetchEvents({ silent: true })
        }, 45000)
        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                void fetchEvents({ silent: true })
            }
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
            clearInterval(t)
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [fetchEvents])

    useEffect(() => {
        if (events.length === 0) return
        fetchReviewStatuses(events)
        const t = setInterval(() => fetchReviewStatuses(events), 30000)
        return () => clearInterval(t)
    }, [events, fetchReviewStatuses])

    const handleDelete = async (id: number) => {
        const ev = events.find((e) => e.id === id)
        const removePermanently =
            ev?.status === "completed" || ev?.status === "canceled" || ev?.status === "cancelled"
        if (
            !confirm(
                removePermanently
                    ? "Remove this event from your dashboard permanently?"
                    : "Cancel this event? It will appear under Canceled, and you can delete it permanently there."
            )
        )
            return

        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        try {
            const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.success(typeof data.message === "string" ? data.message : "Updated")
                await fetchEvents()
            }
        } catch {
            toast.error("Failed to delete event")
        }
    }

    const handleAssignOrganizer = async (eventId: number, organizerId: number) => {
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) return
        setAssigningOrganizerId(organizerId)
        try {
            const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${eventId}/assign-organizer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ organizer_id: organizerId }),
            })
            if (res.ok) {
                toast.success("Organizer assigned successfully")
                setApplicationsModalEventId(null)
                await fetchEvents({ silent: true })
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to assign organizer")
            }
        } catch {
            toast.error("Failed to assign organizer")
        } finally {
            setAssigningOrganizerId(null)
        }
    }

    const handleDeclineApplication = async (eventId: number, organizerId: number) => {
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) return
        setDecliningOrganizerId(organizerId)
        try {
            const res = await fetch(
                `${MY_EVENTS_API_BASE}/api/events/${eventId}/decline-application`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ organizer_id: organizerId }),
                }
            )
            if (res.ok) {
                toast.success("Application declined")
                await reloadApplications(eventId)
                await fetchEvents({ silent: true })
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to decline application")
            }
        } catch {
            toast.error("Failed to decline application")
        } finally {
            setDecliningOrganizerId(null)
        }
    }

    const submitReview = async (rating: number, comment: string | undefined) => {
        if (!reviewDialog) return
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) {
            toast.error("Please sign in again")
            return
        }
        const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${reviewDialog.eventId}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                review_type: "user_to_organizer",
                subject_id: reviewDialog.organizerId,
                rating,
                comment: (comment && comment.trim()) || undefined,
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            toast.error(data.error || "Could not submit review")
            throw new Error(data.error || "submit failed")
        }
        toast.success("Thanks for your feedback")
        const updated = await fetchEvents({ silent: true })
        await fetchReviewStatuses(updated.length ? updated : events)
    }

    return {
        events,
        organizerRequests,
        loading,
        applicationsModalEventId,
        setApplicationsModalEventId,
        applications,
        loadingApplications,
        assigningOrganizerId,
        decliningOrganizerId,
        applicationOrganizerSummaries,
        reviewStatusByEvent,
        reviewDialog,
        setReviewDialog,
        fetchEvents,
        handleDelete,
        openApplicationsModal,
        handleAssignOrganizer,
        handleDeclineApplication,
        submitReview,
    }
}
