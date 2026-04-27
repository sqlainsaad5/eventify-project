/**
 * First day selectable in the "Create Event" date input: local calendar
 * "day after tomorrow" (today and tomorrow are blocked).
 */
export function getMinSelectableEventDateString(now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() + 2)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
