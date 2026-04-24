export type AvailabilityCode = "available" | "limited" | "unavailable"

export type OrganizerRatingSummaries = Record<
    number,
    { organizer: { avg: number | null; count: number }; vendor: { avg: number | null; count: number } }
>

export function normalizeAvailability(a: string | undefined | null): AvailabilityCode {
    const v = (a || "available").toLowerCase()
    if (v === "limited" || v === "unavailable") return v
    return "available"
}

export function availabilityLabel(code: AvailabilityCode) {
    switch (code) {
        case "limited":
            return "Limited availability"
        case "unavailable":
            return "Not accepting new events"
        default:
            return "Available"
    }
}

export function availabilityBadgeClass(code: AvailabilityCode) {
    switch (code) {
        case "limited":
            return "bg-amber-100 text-amber-900 border-amber-200/80"
        case "unavailable":
            return "bg-rose-100 text-rose-900 border-rose-200/80"
        default:
            return "bg-emerald-100 text-emerald-900 border-emerald-200/80"
    }
}

export function getHostRatingDisplay(
    org: Pick<{ id: number; host_rating_avg?: number | null; host_rating_count?: number | null }, "id" | "host_rating_avg" | "host_rating_count">,
    summaries: OrganizerRatingSummaries,
): { avg: number | null; count: number } {
    const cnt = org.host_rating_count ?? 0
    const avg = org.host_rating_avg
    if (cnt > 0 && avg != null) {
        return { avg: Number(avg), count: cnt }
    }
    const s = summaries[org.id]?.organizer
    if (s && s.count > 0) {
        return { avg: s.avg != null ? Number(s.avg) : null, count: s.count }
    }
    return { avg: null, count: 0 }
}
