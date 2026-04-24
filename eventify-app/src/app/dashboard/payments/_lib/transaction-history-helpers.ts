import type { Payment, PaymentWorkflowCategory } from "./payment-workflow-types"

export const TRANSACTION_PAGE_SIZE = 10

export function getPaymentWorkflowCategory(p: Payment): PaymentWorkflowCategory {
  if (p.workflow_category) return p.workflow_category
  if (p.payment_type === "organizer") return "organizer_fee"
  if (p.vendor_id != null && p.vendor_id !== 0) return "vendor_payout"
  return "event_funding"
}

function getCompareDateString(p: Payment) {
  return p.payment_date || p.created_at || ""
}

function dateInRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return true
  if (from) {
    const fromTs = new Date(`${from}T00:00:00.000`).getTime()
    if (!isNaN(fromTs) && t < fromTs) return false
  }
  if (to) {
    const toTs = new Date(`${to}T23:59:59.999`).getTime()
    if (!isNaN(toTs) && t > toTs) return false
  }
  return true
}

export function filterTransactionPayments(
  all: Payment[],
  category: PaymentWorkflowCategory,
  from: string,
  to: string,
  search: string
): Payment[] {
  const s = search.trim().toLowerCase()
  return all.filter((p) => {
    if (getPaymentWorkflowCategory(p) !== category) return false
    const d = getCompareDateString(p)
    if (from || to) {
      if (!d) return false
      if (!dateInRange(d, from, to)) return false
    }
    if (s) {
      const ev = (p.event_name || "").toLowerCase()
      const ven = (p.vendor_name || "").toLowerCase()
      if (!ev.includes(s) && !ven.includes(s)) return false
    }
    return true
  })
}

export function sortTransactionsRecent(payments: Payment[]) {
  return [...payments].sort((a, b) => {
    const ta = new Date(getCompareDateString(a) || 0).getTime()
    const tb = new Date(getCompareDateString(b) || 0).getTime()
    if (tb !== ta) return tb - ta
    return b.id - a.id
  })
}

export function paginateList<T>(items: T[], page: number, perPage: number) {
  const p = Math.max(0, (page - 1) * perPage)
  return items.slice(p, p + perPage)
}

export function pageCount(total: number, perPage: number) {
  if (total === 0) return 1
  return Math.ceil(total / perPage)
}
