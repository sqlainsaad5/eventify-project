"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { ReviewDialog } from "@/components/review-dialog"
import { toast } from "sonner"
import { useOrganizerAssignedEvents } from "../_lib/use-organizer-assigned-events"
import { isEventCompleted, sortEventsRecentFirst, filterByEventDateRange } from "../_lib/organizer-assigned-helpers"
import type { DashboardEvent, AssignedReviewStatus } from "../_lib/types"
import { OrganizerCompletedEventCard } from "./organizer-completed-event-card"
import { AssignedEventDateRangeFilter } from "./assigned-event-date-range-filter"

function syncQuery(router: ReturnType<typeof useRouter>, from: string, to: string) {
  const p = new URLSearchParams()
  if (from) p.set("from", from)
  if (to) p.set("to", to)
  const q = p.toString()
  router.replace(`/dashboard/events/assigned/completed${q ? `?${q}` : ""}`, { scroll: false })
}

export function OrganizerCompletedAssignedViewAll() {
  const { assignedEvents, loading, refetch, API_BASE: api } = useOrganizerAssignedEvents()
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
    syncQuery(router, v, toRef.current)
  }
  const onToChange = (v: string) => {
    setDateTo(v)
    toRef.current = v
    syncQuery(router, fromRef.current, v)
  }
  const onClear = () => {
    setDateFrom("")
    setDateTo("")
    fromRef.current = ""
    toRef.current = ""
    syncQuery(router, "", "")
  }

  const [assignedReviewByEvent, setAssignedReviewByEvent] = useState<Record<number, AssignedReviewStatus>>({})
  const [vendorReviewDialog, setVendorReviewDialog] = useState<{
    eventId: number
    vendorId: number
    vendorName: string
  } | null>(null)

  const allCompleted = useMemo(
    () => sortEventsRecentFirst(assignedEvents.filter((e) => isEventCompleted(e))),
    [assignedEvents]
  )

  const list = useMemo(
    () => filterByEventDateRange(allCompleted, dateFrom || null, dateTo || null),
    [allCompleted, dateFrom, dateTo]
  )

  const fetchAssignedReviewStatuses = useCallback(async (assigned: DashboardEvent[]) => {
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
          const res = await fetch(`${api}/api/events/${e.id}/review-status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return [e.id, null] as const
          const data = await res.json()
          return [
            e.id,
            {
              my_organizer_to_vendor: (data.my_organizer_to_vendor || {}) as Record<string, Record<string, unknown> | null>,
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
  }, [api])

  useEffect(() => {
    if (list.length === 0) {
      setAssignedReviewByEvent({})
      return
    }
    void fetchAssignedReviewStatuses(list)
    const t = setInterval(() => void fetchAssignedReviewStatuses(list), 30000)
    return () => clearInterval(t)
  }, [list, fetchAssignedReviewStatuses])

  return (
    <div className="font-sans pb-12">
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-6 py-5">
          <div className="space-y-1">
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-purple-600 transition-colors w-fit"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to your events
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">All completed assigned projects</h1>
            <p className="text-sm text-slate-500 font-medium max-w-2xl mt-2">Filter by the event’s scheduled day, not the day you completed the work.</p>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-6 py-10 max-w-6xl space-y-6">
        <AssignedEventDateRangeFilter
          idPrefix="completed-vw"
          fromValue={dateFrom}
          toValue={dateTo}
          onFromChange={onFromChange}
          onToChange={onToChange}
          onClear={onClear}
          description="Uses each event’s scheduled day (the same value shown on the card as “Completed on”)."
        />
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading events...</p>
          </div>
        ) : allCompleted.length === 0 ? (
          <div className="rounded-[40px] border border-slate-100 bg-slate-50/80 px-8 py-16 text-center">
            <p className="text-slate-600 font-bold text-lg">You have no completed assigned projects in this list.</p>
            <Button asChild className="mt-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/dashboard/events">Return to your events</Link>
            </Button>
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((event) => (
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
          <div className="rounded-[40px] border border-slate-100 bg-slate-50/80 px-8 py-16 text-center">
            <p className="text-slate-600 font-bold text-lg">
              No projects fall within the selected event date range. Try different dates or clear the filter.
            </p>
            <Button type="button" className="mt-6 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={onClear}>
              Clear date filter
            </Button>
          </div>
        )}
      </main>
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
          const res = await fetch(`${api}/api/events/${vendorReviewDialog.eventId}/reviews`, {
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
          const next = await refetch()
          const completed = sortEventsRecentFirst(next.filter((e) => isEventCompleted(e)))
          if (completed.length) await fetchAssignedReviewStatuses(completed)
        }}
      />
    </div>
  )
}
