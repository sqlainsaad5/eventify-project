"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { UserDashboardEvent, EventReviewStatus, EventApplicationRow, OrganizerRequest } from "./types"
import { MY_EVENTS_API_BASE } from "./types"

export function useMyEventsDashboard() {
    const [events, setEvents] = useState<UserDashboardEvent[]>([])
    const [organizerRequests, setOrganizerRequests] = useState<OrganizerRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [applicationsModalEventId, setApplicationsModalEventId] = useState<number | null>(null)
    const [applications, setApplications] = useState<EventApplicationRow[]>([])
    const [loadingApplications, setLoadingApplications] = useState(false)
    const [assigningOrganizerId, setAssigningOrganizerId] = useState<number | null>(null)
    const [reviewStatusByEvent, setReviewStatusByEvent] = useState<Record<number, EventReviewStatus>>({})
    const [reviewDialog, setReviewDialog] = useState<{
        eventId: number
        organizerId: number
        organizerName: string
    } | null>(null)

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

    const fetchEvents = useCallback(async (): Promise<UserDashboardEvent[]> => {
        setLoading(true)
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) {
            setLoading(false)
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
                setEvents(created)
            } else {
                toast.error("Failed to load your events")
            }
            if (requestsRes.ok) {
                const reqData = await requestsRes.json()
                setOrganizerRequests(reqData.organizer_requests || [])
            }
        } catch (err) {
            console.error("Fetch error:", err)
            toast.error("Internal service error")
        } finally {
            setLoading(false)
        }
        return created
    }, [])

    useEffect(() => {
        fetchEvents()
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

    const openApplicationsModal = async (eventId: number) => {
        setApplicationsModalEventId(eventId)
        setApplications([])
        setLoadingApplications(true)
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        try {
            const res = await fetch(`${MY_EVENTS_API_BASE}/api/events/${eventId}/applications`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setApplications(Array.isArray(data) ? data : [])
            } else {
                toast.error("Failed to load applications")
            }
        } catch {
            toast.error("Failed to load applications")
        } finally {
            setLoadingApplications(false)
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
                await fetchEvents()
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

    const submitReview = async (rating: number, comment: string) => {
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
                comment: comment.trim() || undefined,
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            toast.error(data.error || "Could not submit review")
            throw new Error(data.error || "submit failed")
        }
        toast.success("Thanks for your feedback")
        const updated = await fetchEvents()
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
        reviewStatusByEvent,
        reviewDialog,
        setReviewDialog,
        fetchEvents,
        handleDelete,
        openApplicationsModal,
        handleAssignOrganizer,
        submitReview,
    }
}
