"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, LayoutGrid, List, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { ReviewDialog } from "@/components/review-dialog"
import { DashboardEventGridCard } from "./_components/dashboard-event-grid-card"
import { DashboardEventListTable } from "./_components/dashboard-event-list-row"
import { AssignedSectionHeader } from "./_components/assigned-section-header"
import { DASHBOARD_ASSIGNED_PREVIEW_LIMIT } from "./_lib/constants"
import {
  isEventCompleted,
  partitionAssignedActiveForOrganizer,
  sortEventsRecentFirst,
  filterByEventDateRange,
  withDateRangeQuery,
} from "./_lib/organizer-assigned-helpers"
import type { DashboardEvent, AssignedReviewStatus } from "./_lib/types"
import { OrganizerCompletedEventCard } from "./_components/organizer-completed-event-card"
import { AssignedEventDateRangeFilter } from "./_components/assigned-event-date-range-filter"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function AllEventsPage() {
  const [assignedEvents, setAssignedEvents] = useState<DashboardEvent[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<{ event_id: number; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [requestedAdvanceEventIds, setRequestedAdvanceEventIds] = useState<number[]>([])
  const [completingEventId, setCompletingEventId] = useState<number | null>(null)
  const [assignedReviewByEvent, setAssignedReviewByEvent] = useState<Record<number, AssignedReviewStatus>>({})
  const [vendorReviewDialog, setVendorReviewDialog] = useState<{
    eventId: number
    vendorId: number
    vendorName: string
  } | null>(null)
  const [assignedDateFrom, setAssignedDateFrom] = useState("")
  const [assignedDateTo, setAssignedDateTo] = useState("")

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchAssignedReviewStatuses = async (assigned: DashboardEvent[]) => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    const targets = assigned.filter((e) => (e.completed_vendors?.length ?? 0) > 0 || e.status === "completed")
    if (targets.length === 0) {
      setAssignedReviewByEvent({})
      return
    }
    const results = await Promise.all(
      targets.map(async (e) => {
        try {
          const res = await fetch(`${API_BASE}/api/events/${e.id}/review-status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return [e.id, null] as const
          const data = await res.json()
          return [
            e.id,
            {
              my_organizer_to_vendor: (data.my_organizer_to_vendor || {}) as Record<
                string,
                Record<string, unknown> | null
              >,
              can_review_vendor_ids: (data.can_review_vendor_ids || []) as number[],
            },
          ] as const
        } catch {
          return [e.id, null] as const
        }
      })
    )
    const next: Record<number, AssignedReviewStatus> = {}
    for (const [id, row] of results) {
      if (row) next[id] = row
    }
    setAssignedReviewByEvent(next)
  }

  useEffect(() => {
    if (assignedEvents.length === 0) return
    fetchAssignedReviewStatuses(assignedEvents)
    const t = setInterval(() => fetchAssignedReviewStatuses(assignedEvents), 30000)
    return () => clearInterval(t)
  }, [assignedEvents])

  useEffect(() => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    fetch(`${API_BASE}/api/payments/notifications/mark-read-by-action`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "assignment_review" }),
    }).then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
    }).catch(() => {})
  }, [])

  const fetchEvents = async (): Promise<DashboardEvent[]> => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    let assigned: DashboardEvent[] = []
    try {
      const [eventsRes, organizerRequestsRes] = await Promise.all([
        fetch(`${API_BASE}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/payments/organizer-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        assigned = (data.assigned as DashboardEvent[]) || []
        setAssignedEvents(assigned)
      } else {
        toast.error("Failed to fetch events")
      }
      if (organizerRequestsRes.ok) {
        const reqData = await organizerRequestsRes.json()
        setOrganizerRequests(reqData.organizer_requests || [])
      }
    } catch (err) {
      console.error("Fetch events error:", err)
      toast.error("An error occurred while fetching events")
    } finally {
      setLoading(false)
    }
    return assigned
  }

  const handleAssignmentResponse = async (id: number, status: 'accepted' | 'rejected') => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/respond-assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success(`Project ${status === 'accepted' ? 'accepted' : 'declined'} successfully`)
        // Refresh events to update status
        fetchEvents()
      } else {
        toast.error("Failed to update status")
      }
    } catch (err) {
      toast.error("Error updating assignment status")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return

    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success("Event deleted successfully")
        fetchEvents()
      } else {
        toast.error("Failed to delete event")
      }
    } catch (err) {
      toast.error("Error deleting event")
    }
  }

  const statusLabel = (status?: string) => {
    switch (status) {
      case "awaiting_organizer_confirmation":
        return "Awaiting Organizer Confirmation"
      case "pending_advance_payment":
        return "Pending Advance Payment"
      case "advance_payment_completed":
        return "25% Payment Completed"
      case "vendor_assigned":
        return "Vendor Assigned"
      case "completed":
        return "Event Completed"
      case "created":
      default:
        return "Created"
    }
  }

  const matchesSearch = (e: DashboardEvent) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())

  const organizerAdvanceLabel = (status?: string) => {
    switch (status) {
      case "pending":
        return "25% advance requested"
      case "paid":
        return "25% advance paid"
      case "rejected":
        return "25% advance rejected"
      default:
        return status || ""
    }
  }

  const activeAssignedEvents = assignedEvents.filter((e) => !isEventCompleted(e))
  const completedAssignedEvents = assignedEvents.filter(isEventCompleted)

  const filteredActiveAssigned = activeAssignedEvents.filter(matchesSearch)
  const filteredCompletedAssigned = completedAssignedEvents.filter(matchesSearch)

  const activeAssignedInDateRange = useMemo(
    () => filterByEventDateRange(filteredActiveAssigned, assignedDateFrom || null, assignedDateTo || null),
    [filteredActiveAssigned, assignedDateFrom, assignedDateTo]
  )
  const { pending: pendingAssigned, accepted: acceptedInProgress, declined: declinedAssigned, other: otherAssigned } = useMemo(
    () => partitionAssignedActiveForOrganizer(activeAssignedInDateRange),
    [activeAssignedInDateRange]
  )
  const assignedPreviewLimit = DASHBOARD_ASSIGNED_PREVIEW_LIMIT

  const completedList = useMemo(
    () => filterByEventDateRange(filteredCompletedAssigned, assignedDateFrom || null, assignedDateTo || null),
    [filteredCompletedAssigned, assignedDateFrom, assignedDateTo]
  )
  const sortedCompletedList = useMemo(() => sortEventsRecentFirst(completedList), [completedList])
  const completedDisplay = sortedCompletedList.slice(0, assignedPreviewLimit)
  const showCompletedViewAll = sortedCompletedList.length > assignedPreviewLimit
  const completedViewAllHref = useMemo(
    () => withDateRangeQuery("/dashboard/events/assigned/completed", assignedDateFrom, assignedDateTo),
    [assignedDateFrom, assignedDateTo]
  )
  const hasAnyCompletedForTab = filteredCompletedAssigned.length > 0
  const showEventSurface = useMemo(
    () =>
      pendingAssigned.length + acceptedInProgress.length + declinedAssigned.length + otherAssigned.length > 0
      || filteredCompletedAssigned.length > 0,
    [pendingAssigned, acceptedInProgress, declinedAssigned, otherAssigned, filteredCompletedAssigned]
  )
  const assignedRangeHref = (subPath: string) => withDateRangeQuery(subPath, assignedDateFrom, assignedDateTo)
  const assignedOpenInRangeCount =
    pendingAssigned.length + acceptedInProgress.length + declinedAssigned.length + otherAssigned.length
  const showAssignedNoOpenButCompletedInFilter =
    (assignedDateFrom || assignedDateTo) &&
    assignedOpenInRangeCount === 0 &&
    sortedCompletedList.length > 0

  const getUserId = (): number | null => {
    try {
      const u = localStorage.getItem("user")
      if (!u) return null
      const parsed = JSON.parse(u)
      return parsed?.id ?? parsed?._id ?? null
    } catch { return null }
  }

  const gridCardProps = {
    getUserId,
    organizerRequests,
    onAssignmentResponse: handleAssignmentResponse,
    onRefetch: fetchEvents,
    apiBase: API_BASE,
    requestedAdvanceEventIds,
    setRequestedAdvanceEventIds,
    completingEventId,
    setCompletingEventId,
    statusLabel,
    organizerAdvanceLabel,
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 p-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Events</h1>
            <p className="text-slate-500 mt-1 font-medium">Assigned projects you manage for event hosts.</p>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
            <Input
              placeholder="Search by name, venue or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-purple-600/20"
            />
          </div>

          {assignedEvents.length > 0 && (
            <Badge className="hidden sm:inline-flex bg-purple-100 text-purple-800 border-none text-xs font-bold px-3 py-1 rounded-full">
              {assignedEvents.length} assigned
            </Badge>
          )}

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <Button
              variant={viewMode === "grid" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-9 w-9 rounded-xl ${viewMode === "grid" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-9 w-9 rounded-xl ${viewMode === "list" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!loading && (
          <AssignedEventDateRangeFilter
            idPrefix="dash-assigned"
            fromValue={assignedDateFrom}
            toValue={assignedDateTo}
            onFromChange={setAssignedDateFrom}
            onToChange={setAssignedDateTo}
            onClear={() => {
              setAssignedDateFrom("")
              setAssignedDateTo("")
            }}
          />
        )}

        {/* Events Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Assembling your events...</p>
          </div>
        ) : showEventSurface ? (
          viewMode === "grid" ? (
            <div className="space-y-16">
              {showAssignedNoOpenButCompletedInFilter && (
                  <div
                    className="rounded-2xl border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm text-slate-600"
                    role="status"
                  >
                    No open assignments in this event date range. You still have completed projects in this
                    range—see below.
                  </div>
                )}
              {pendingAssigned.length > 0 && (
                <section className="space-y-6">
                  <AssignedSectionHeader
                    title="Awaiting your approval"
                    showViewAll={pendingAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/pending")}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pendingAssigned.slice(0, assignedPreviewLimit).map((event) => (
                      <DashboardEventGridCard
                        key={event.id}
                        event={event}
                        activeTab="assigned"
                        {...gridCardProps}
                      />
                    ))}
                  </div>
                </section>
              )}
              {acceptedInProgress.length > 0 && (
                <section className="space-y-6">
                  <AssignedSectionHeader
                    title="Active projects"
                    showViewAll={acceptedInProgress.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/in-progress")}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {acceptedInProgress.slice(0, assignedPreviewLimit).map((event) => (
                      <DashboardEventGridCard
                        key={event.id}
                        event={event}
                        activeTab="assigned"
                        {...gridCardProps}
                      />
                    ))}
                  </div>
                </section>
              )}
              {declinedAssigned.length > 0 && (
                <section className="space-y-6">
                  <AssignedSectionHeader
                    title="Declined assignments"
                    showViewAll={declinedAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/declined")}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {declinedAssigned.slice(0, assignedPreviewLimit).map((event) => (
                      <DashboardEventGridCard
                        key={event.id}
                        event={event}
                        activeTab="assigned"
                        {...gridCardProps}
                      />
                    ))}
                  </div>
                </section>
              )}
              {otherAssigned.length > 0 && (
                <section className="space-y-6">
                  <AssignedSectionHeader
                    title="Other assignments"
                    showViewAll={otherAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/other")}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {otherAssigned.slice(0, assignedPreviewLimit).map((event) => (
                      <DashboardEventGridCard
                        key={event.id}
                        event={event}
                        activeTab="assigned"
                        {...gridCardProps}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {showAssignedNoOpenButCompletedInFilter && (
                <div
                  className="rounded-2xl border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm text-slate-600"
                  role="status"
                >
                  No open assignments in this event date range. You still have completed projects in this
                  range—see below.
                </div>
              )}
              {pendingAssigned.length > 0 && (
                <div className="space-y-4">
                  <AssignedSectionHeader
                    title="Awaiting your approval"
                    showViewAll={pendingAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/pending")}
                  />
                  <DashboardEventListTable
                    events={pendingAssigned.slice(0, assignedPreviewLimit)}
                    activeTab="assigned"
                    getUserId={getUserId}
                    onDelete={handleDelete}
                    onAssignmentResponse={handleAssignmentResponse}
                    statusLabel={statusLabel}
                  />
                </div>
              )}
              {acceptedInProgress.length > 0 && (
                <div className="space-y-4">
                  <AssignedSectionHeader
                    title="Active projects"
                    showViewAll={acceptedInProgress.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/in-progress")}
                  />
                  <DashboardEventListTable
                    events={acceptedInProgress.slice(0, assignedPreviewLimit)}
                    activeTab="assigned"
                    getUserId={getUserId}
                    onDelete={handleDelete}
                    onAssignmentResponse={handleAssignmentResponse}
                    statusLabel={statusLabel}
                  />
                </div>
              )}
              {declinedAssigned.length > 0 && (
                <div className="space-y-4">
                  <AssignedSectionHeader
                    title="Declined assignments"
                    showViewAll={declinedAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/declined")}
                  />
                  <DashboardEventListTable
                    events={declinedAssigned.slice(0, assignedPreviewLimit)}
                    activeTab="assigned"
                    getUserId={getUserId}
                    onDelete={handleDelete}
                    onAssignmentResponse={handleAssignmentResponse}
                    statusLabel={statusLabel}
                  />
                </div>
              )}
              {otherAssigned.length > 0 && (
                <div className="space-y-4">
                  <AssignedSectionHeader
                    title="Other assignments"
                    showViewAll={otherAssigned.length > assignedPreviewLimit}
                    href={assignedRangeHref("/dashboard/events/assigned/other")}
                  />
                  <DashboardEventListTable
                    events={otherAssigned.slice(0, assignedPreviewLimit)}
                    activeTab="assigned"
                    getUserId={getUserId}
                    onDelete={handleDelete}
                    onAssignmentResponse={handleAssignmentResponse}
                    statusLabel={statusLabel}
                  />
                </div>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No assignments yet</h3>
            <p className="text-slate-500 mt-2 max-w-sm text-center font-medium">
              You do not have any projects here yet. When a host assigns you to an event, it will show up in this list. Try adjusting your search or date filter.
            </p>
          </div>
        )}
        {!loading && hasAnyCompletedForTab && (
          <div className="mt-12 space-y-4">
            <AssignedSectionHeader
              title="Completed assigned projects"
              showViewAll={showCompletedViewAll}
              href={completedViewAllHref}
            />
            {completedDisplay.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedDisplay.map((event) => (
                  <OrganizerCompletedEventCard
                    key={event.id}
                    event={event}
                    showVendorSection
                    assignedReviewByEvent={assignedReviewByEvent}
                    onOpenReview={setVendorReviewDialog}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  No completed assigned projects match the selected event date range. Adjust the dates or clear the filter.
                </p>
              </div>
            )}
          </div>
        )}

        <ReviewDialog
          open={vendorReviewDialog !== null}
          onOpenChange={(open) => {
            if (!open) setVendorReviewDialog(null)
          }}
          variant="professional"
          title={vendorReviewDialog ? `Rate ${vendorReviewDialog.vendorName}` : "Rate vendor"}
          description="Your professional rating is visible to this vendor and helps other organizers choose reliable partners."
          onSubmit={async (rating, comment) => {
            if (!vendorReviewDialog) return
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            if (!token) {
              toast.error("Please sign in again")
              return
            }
            const res = await fetch(`${API_BASE}/api/events/${vendorReviewDialog.eventId}/reviews`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                review_type: "organizer_to_vendor",
                subject_id: vendorReviewDialog.vendorId,
                rating,
                comment: comment || undefined,
              }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              toast.error(data.error || "Could not submit review")
              throw new Error(data.error || "submit failed")
            }
            toast.success("Thanks for your feedback")
            const assigned = await fetchEvents()
            await fetchAssignedReviewStatuses(assigned.length ? assigned : assignedEvents)
          }}
        />
      </div>
    </DashboardLayout>
  )
}
