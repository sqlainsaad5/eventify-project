import type { Event, PaymentRequest, OrganizerPaymentRequest } from "./payment-workflow-types"

function ts(s?: string | null) {
  if (!s) return 0
  const t = new Date(s).getTime()
  return isNaN(t) ? 0 : t
}

export function sortEventsForFundingRecent(a: Event, b: Event) {
  const ta = ts((a as { created_at?: string }).created_at) || 0
  const tb = ts((b as { created_at?: string }).created_at) || 0
  if (tb !== ta) return tb - ta
  return b.id - a.id
}

export function sortPaymentRequestsRecent(a: PaymentRequest, b: PaymentRequest) {
  return ts(b.created_at) - ts(a.created_at) || b.id - a.id
}

export function sortOrganizerPaymentRequestsRecent(a: OrganizerPaymentRequest, b: OrganizerPaymentRequest) {
  return ts(b.created_at) - ts(a.created_at) || b.id - a.id
}

/** Generic event row by id (scheduled order of creation) */
export function sortEventsByIdDesc<T extends { id: number }>(a: T, b: T) {
  return b.id - a.id
}
