/**
 * Tracks "seen" vendor bookings in localStorage so a small "1" badge can
 * show on new event cards until the vendor has viewed that booking.
 * First-time baseline: current event IDs are marked seen once so only
 * later arrivals appear as "new."
 */

const baselineKey = (vendorId: number) => `eventify_vb_baseline_v${vendorId}`
const seenKey = (vendorId: number, eventId: number) => `eventify_vb_v${vendorId}_e${eventId}`

export function seedVendorBookingBaseline(
  vendorId: number | null,
  allEventIds: number[]
) {
  if (typeof window === "undefined" || !vendorId) return
  if (localStorage.getItem(baselineKey(vendorId))) return
  const unique = [...new Set(allEventIds.filter((n) => Number.isFinite(n)))]
  unique.forEach((id) => {
    try {
      localStorage.setItem(seenKey(vendorId, id), "1")
    } catch {
      /* ignore */
    }
  })
  try {
    localStorage.setItem(baselineKey(vendorId), "1")
  } catch {
    /* ignore */
  }
}

export function isVendorBookingUnseen(vendorId: number | null, eventId: number): boolean {
  if (typeof window === "undefined" || !vendorId) return false
  if (!Number.isFinite(eventId)) return false
  return !localStorage.getItem(seenKey(vendorId, eventId))
}

export function markVendorBookingSeen(vendorId: number | null, eventId: number) {
  if (typeof window === "undefined" || !vendorId) return
  if (!Number.isFinite(eventId)) return
  try {
    localStorage.setItem(seenKey(vendorId, eventId), "1")
  } catch {
    /* ignore */
  }
}

const PREVIEW = 3
export { PREVIEW as VENDOR_EVENT_PREVIEW_COUNT }

export function getPreviewVisible<T>(items: T[], expanded: boolean): T[] {
  if (expanded) return items
  return items.slice(0, PREVIEW)
}
