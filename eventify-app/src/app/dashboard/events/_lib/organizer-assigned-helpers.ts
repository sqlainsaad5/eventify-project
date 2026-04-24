import type { DashboardEvent } from "./types"

export function isEventCompleted(e: DashboardEvent) {
  return (typeof e.status === "string" && e.status.toLowerCase() === "completed") || Number(e.progress || 0) >= 100
}

/** Newest first: last updated, else created, else by id. */
function eventRecencySortKey(e: DashboardEvent): number {
  const u = e.updated_at
  const c = e.created_at
  if (u) {
    const t = new Date(u).getTime()
    if (!Number.isNaN(t)) return t
  }
  if (c) {
    const t = new Date(c).getTime()
    if (!Number.isNaN(t)) return t
  }
  return e.id
}

export function sortEventsRecentFirst(events: DashboardEvent[]): DashboardEvent[] {
  return [...events].sort((a, b) => {
    const diff = eventRecencySortKey(b) - eventRecencySortKey(a)
    if (diff !== 0) return diff
    return b.id - a.id
  })
}

export function partitionAssignedActiveForOrganizer(assigned: DashboardEvent[]) {
  const pending = sortEventsRecentFirst(assigned.filter((e) => e.organizer_status === "pending"))
  const accepted = sortEventsRecentFirst(assigned.filter((e) => e.organizer_status === "accepted"))
  const declined = sortEventsRecentFirst(assigned.filter((e) => e.organizer_status === "rejected"))
  const other = sortEventsRecentFirst(
    assigned.filter(
      (e) => e.organizer_status != null && !["pending", "accepted", "rejected"].includes(e.organizer_status)
    )
  )
  return { pending, accepted, declined, other }
}

/**
 * Filter by event's scheduled `date` (ISO string) falling within [from, to] (inclusive), local calendar days.
 * `fromDate` / `toDate` are `YYYY-MM-DD` or empty/undefined to leave that bound open.
 */
/** Appends `from` and `to` (YYYY-MM-DD) as query string when at least one is set. */
export function withDateRangeQuery(path: string, fromDate: string, toDate: string) {
  const f = (fromDate || "").trim()
  const t = (toDate || "").trim()
  if (!f && !t) return path
  const base = path.split("?")[0]
  const p = new URLSearchParams()
  if (f) p.set("from", f)
  if (t) p.set("to", t)
  return `${base}?${p.toString()}`
}

export function filterByEventDateRange(
  events: DashboardEvent[],
  fromDate: string | null | undefined,
  toDate: string | null | undefined
) {
  const from = (fromDate || "").trim()
  const to = (toDate || "").trim()
  if (!from && !to) return events

  const fromTs = from ? new Date(`${from}T00:00:00.000`).getTime() : NaN
  const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : NaN

  return events.filter((e) => {
    const t = new Date(e.date).getTime()
    if (isNaN(t)) return true
    if (from && !isNaN(fromTs) && t < fromTs) return false
    if (to && !isNaN(toTs) && t > toTs) return false
    return true
  })
}
