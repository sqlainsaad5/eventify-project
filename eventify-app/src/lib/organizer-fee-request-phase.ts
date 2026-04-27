/**
 * Derives the organizer fee phase from the API's description string.
 * Keep in sync with any backend text for 25% advance vs 75% final requests.
 */
export function organizerRequestPhase(
  description: string | null | undefined
): "Final 75%" | "Advance 25%" | "Organizer Fee" {
  const d = (description || "").toLowerCase()
  if (d.includes("75%") || d.includes("final")) return "Final 75%"
  if (d.includes("25%") || d.includes("advance")) return "Advance 25%"
  return "Organizer Fee"
}

export function isOrganizerFinal75FeeRequest(
  description: string | null | undefined
): boolean {
  return organizerRequestPhase(description) === "Final 75%"
}
