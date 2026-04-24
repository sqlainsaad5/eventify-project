"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Payment, PaymentWorkflowCategory } from "../_lib/payment-workflow-types"
import {
  getPaymentWorkflowCategory,
  filterTransactionPayments,
  sortTransactionsRecent,
  paginateList,
  pageCount,
  TRANSACTION_PAGE_SIZE,
} from "../_lib/transaction-history-helpers"

const LABELS: Record<PaymentWorkflowCategory, string> = {
  event_funding: "Event funding",
  vendor_payout: "Vendor payout",
  organizer_fee: "Organizer fee",
}

function HistorySection({
  category,
  payments,
  formatCurrency,
}: {
  category: PaymentWorkflowCategory
  payments: Payment[]
  formatCurrency: (n: number) => string
}) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => sortTransactionsRecent(filterTransactionPayments(payments, category, dateFrom, dateTo, search)),
    [payments, category, dateFrom, dateTo, search]
  )

  const totalPages = pageCount(filtered.length, TRANSACTION_PAGE_SIZE)
  const rows = useMemo(
    () => paginateList(filtered, page, TRANSACTION_PAGE_SIZE),
    [filtered, page]
  )

  useEffect(() => {
    setPage(1)
  }, [dateFrom, dateTo, search])

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages))
  }, [page, totalPages])

  const fromId = `tx-hist-${category}-from`
  const toId = `tx-hist-${category}-to`
  const qId = `tx-hist-${category}-q`

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-medium">
        <span className="font-bold text-slate-700">{LABELS[category]}</span> — filter by payment date; search by event or vendor
        name.
      </p>
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor={fromId} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            From
          </Label>
          <Input
            id={fromId}
            type="date"
            className="mt-1.5 h-9 rounded-lg border-slate-200"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={toId} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            To
          </Label>
          <Input
            id={toId}
            type="date"
            className="mt-1.5 h-9 rounded-lg border-slate-200"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <Label htmlFor={qId} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Search by name
          </Label>
          <Input
            id={qId}
            className="mt-1.5 h-9 rounded-lg border-slate-200"
            placeholder="Event or vendor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">No records match the selected filters.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const cat = getPaymentWorkflowCategory(p)
            return (
              <div
                key={p.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 p-2">
                    <CreditCard className="h-4 w-4 text-slate-800" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.event_name}</p>
                    {p.vendor_name && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{p.vendor_name}</p>}
                    <p className="text-[9px] font-mono text-slate-400 mt-1 line-clamp-1">{p.transaction_id || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:min-w-0 pl-0 sm:pl-4 sm:border-l sm:border-slate-100">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[8px] font-black uppercase tracking-widest",
                      cat === "event_funding" && "border-violet-200 text-violet-800",
                      cat === "vendor_payout" && "border-amber-200 text-amber-800",
                      cat === "organizer_fee" && "border-slate-300 text-slate-800"
                    )}
                  >
                    {cat === "event_funding" ? "Funding" : cat === "vendor_payout" ? "Vendor" : "Organizer"}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">+{formatCurrency(p.amount)}</p>
                    <Badge className="mt-1 h-4 border-none text-[7px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {filtered.length > 0 && totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * TRANSACTION_PAGE_SIZE + 1}–{Math.min(page * TRANSACTION_PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-bold text-slate-600 min-w-24 text-center">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

type TabKey = "funding" | "vendor" | "organizer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payments: Payment[]
  formatCurrency: (n: number) => string
  /** Align with dashboard tab: payments → funding, requests → vendor, organizer → organizer */
  defaultSection?: TabKey
}

export function TransactionHistoryDialog({ open, onOpenChange, payments, formatCurrency, defaultSection = "funding" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[min(90vh,880px)] flex flex-col overflow-hidden p-0 sm:max-w-3xl">
        <div className="p-6 pb-2 pr-12">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-black text-slate-900 tracking-tight">Transaction history</DialogTitle>
            <p className="text-left text-sm text-slate-500 font-medium pr-2">
              Browse completed and pending Stripe lines by workflow. 10 per page, filter by range and name.
            </p>
          </DialogHeader>
        </div>
        <Tabs key={defaultSection} defaultValue={defaultSection} className="flex-1 min-h-0 flex flex-col px-6 pb-6">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1 rounded-2xl bg-slate-100/80">
            <TabsTrigger value="funding" className="rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Event funding
            </TabsTrigger>
            <TabsTrigger value="vendor" className="rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Vendor payout
            </TabsTrigger>
            <TabsTrigger value="organizer" className="rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Organizer fee
            </TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto pt-4 mt-1 -mx-1 px-1 max-h-[min(56vh,560px)]">
            <TabsContent value="funding" className="m-0 outline-none">
              <HistorySection
                category="event_funding"
                payments={payments}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
            <TabsContent value="vendor" className="m-0 outline-none">
              <HistorySection
                category="vendor_payout"
                payments={payments}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
            <TabsContent value="organizer" className="m-0 outline-none">
              <HistorySection
                category="organizer_fee"
                payments={payments}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
