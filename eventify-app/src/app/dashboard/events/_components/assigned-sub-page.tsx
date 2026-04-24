"use client"

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DashboardEventGridCard } from "./dashboard-event-grid-card"
import { useOrganizerAssignedEvents } from "../_lib/use-organizer-assigned-events"
import { isEventCompleted, partitionAssignedActiveForOrganizer, filterByEventDateRange } from "../_lib/organizer-assigned-helpers"
import { AssignedEventDateRangeFilter } from "./assigned-event-date-range-filter"

type FilterKey = "pending" | "accepted" | "declined" | "other"

function syncQuery(router: ReturnType<typeof useRouter>, basePath: string, from: string, to: string) {
  const p = new URLSearchParams()
  if (from) p.set("from", from)
  if (to) p.set("to", to)
  const q = p.toString()
  router.replace(`${basePath}${q ? `?${q}` : ""}`, { scroll: false })
}

function getUserId(): number | null {
  try {
    const u = localStorage.getItem("user")
    if (!u) return null
    const parsed = JSON.parse(u)
    return parsed?.id ?? parsed?._id ?? null
  } catch {
    return null
  }
}

function SubPageFallback() {
  return (
    <div className="font-sans pb-12">
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-6 py-10 flex justify-center">
          <Loader2 className="h-9 w-9 text-purple-600 animate-spin" />
        </div>
      </div>
    </div>
  )
}

type InnerProps = {
  title: string
  filter: FilterKey
  emptyMessage: string
  basePath: string
  filterDescription: string
}

function AssignedSubPageInner({ title, filter, emptyMessage, basePath, filterDescription }: InnerProps) {
  const { assignedEvents, organizerRequests, loading, refetch, API_BASE } = useOrganizerAssignedEvents()
  const [requestedAdvanceEventIds, setRequestedAdvanceEventIds] = useState<number[]>([])
  const [completingEventId, setCompletingEventId] = useState<number | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "")
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "")
  const fromRef = useRef(dateFrom)
  const toRef = useRef(dateTo)
  fromRef.current = dateFrom
  toRef.current = dateTo

  useEffect(() => {
    setDateFrom(searchParams.get("from") ?? "")
    setDateTo(searchParams.get("to") ?? "")
  }, [searchParams])

  const onFromChange = (v: string) => {
    setDateFrom(v)
    fromRef.current = v
    syncQuery(router, basePath, v, toRef.current)
  }
  const onToChange = (v: string) => {
    setDateTo(v)
    toRef.current = v
    syncQuery(router, basePath, fromRef.current, v)
  }
  const onClear = () => {
    setDateFrom("")
    setDateTo("")
    fromRef.current = ""
    toRef.current = ""
    syncQuery(router, basePath, "", "")
  }

  const unfiltered = useMemo(() => {
    const active = assignedEvents.filter((e) => !isEventCompleted(e))
    const { pending, accepted, declined, other } = partitionAssignedActiveForOrganizer(active)
    switch (filter) {
      case "pending":
        return pending
      case "accepted":
        return accepted
      case "declined":
        return declined
      case "other":
        return other
    }
  }, [assignedEvents, filter])

  const list = useMemo(
    () => filterByEventDateRange(unfiltered, dateFrom || null, dateTo || null),
    [unfiltered, dateFrom, dateTo]
  )
  const noneInRange = unfiltered.length > 0 && list.length === 0

  const statusLabel = useCallback((status?: string) => {
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
  }, [])

  const organizerAdvanceLabel = useCallback((s?: string) => {
    switch (s) {
      case "pending":
        return "25% advance requested"
      case "paid":
        return "25% advance paid"
      case "rejected":
        return "25% advance rejected"
      default:
        return s || ""
    }
  }, [])

  const handleAssignmentResponse = async (id: number, status: "accepted" | "rejected") => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/respond-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(`Project ${status === "accepted" ? "accepted" : "declined"} successfully`)
        refetch()
      } else {
        toast.error("Failed to update status")
      }
    } catch {
      toast.error("Error updating assignment status")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success("Event deleted successfully")
        refetch()
      } else {
        toast.error("Failed to delete event")
      }
    } catch {
      toast.error("Error deleting event")
    }
  }

  return (
    <div className="font-sans pb-12">
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-purple-600 transition-colors w-fit"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to your events
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 font-medium max-w-xl">Scheduled event dates; filters apply the same way as on your main dashboard.</p>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-6 py-10 max-w-6xl space-y-6">
        <AssignedEventDateRangeFilter
          idPrefix={`asg-${filter}`}
          fromValue={dateFrom}
          toValue={dateTo}
          onFromChange={onFromChange}
          onToChange={onToChange}
          onClear={onClear}
          description={filterDescription}
        />
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading events...</p>
          </div>
        ) : unfiltered.length === 0 ? (
          <div className="rounded-[40px] border border-slate-100 bg-slate-50/80 px-8 py-16 text-center">
            <p className="text-slate-600 font-bold text-lg">{emptyMessage}</p>
            <Button asChild className="mt-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/dashboard/events">Return to your events</Link>
            </Button>
          </div>
        ) : noneInRange ? (
          <div className="rounded-[40px] border border-dashed border-amber-200/90 bg-amber-50/40 px-8 py-14 text-center">
            <p className="text-slate-700 font-semibold text-base">Nothing in this list matches the selected event date range.</p>
            <p className="text-slate-500 text-sm mt-2">Widen the range or clear the filter to see your projects.</p>
            <Button type="button" variant="outline" className="mt-6 rounded-xl font-bold" onClick={onClear}>
              Clear date range
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {list.map((event) => (
              <DashboardEventGridCard
                key={event.id}
                event={event}
                activeTab="assigned"
                getUserId={getUserId}
                organizerRequests={organizerRequests}
                onDelete={handleDelete}
                onAssignmentResponse={handleAssignmentResponse}
                onRefetch={refetch}
                apiBase={API_BASE}
                requestedAdvanceEventIds={requestedAdvanceEventIds}
                setRequestedAdvanceEventIds={setRequestedAdvanceEventIds}
                completingEventId={completingEventId}
                setCompletingEventId={setCompletingEventId}
                statusLabel={statusLabel}
                organizerAdvanceLabel={organizerAdvanceLabel}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const FILTER_COPY: Record<FilterKey, string> = {
  pending: "By each event’s scheduled day—not when the request was sent.",
  accepted: "Filter your active work by the event’s scheduled day on the calendar.",
  declined: "Narrow the list using each event’s original scheduled day.",
  other: "By scheduled day for events in this group.",
}

export function AssignedSubPage({ title, filter, emptyMessage, basePath }: { title: string; filter: FilterKey; emptyMessage: string; basePath: string }) {
  return (
    <Suspense fallback={<SubPageFallback />}>
      <AssignedSubPageInner
        title={title}
        filter={filter}
        emptyMessage={emptyMessage}
        basePath={basePath}
        filterDescription={FILTER_COPY[filter]}
      />
    </Suspense>
  )
}
