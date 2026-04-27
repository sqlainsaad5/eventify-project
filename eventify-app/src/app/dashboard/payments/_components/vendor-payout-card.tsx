"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2 } from "lucide-react"
import { ReactNode } from "react"
import type { PaymentRequest } from "../_lib/payment-workflow-types"

type Props = {
  req: PaymentRequest
  formatCurrency: (n: number) => string
  getStatusBadge: (status: string) => ReactNode
  onApprove: (id: number) => void
  onAuthorize: (eventId: number, amount: number, requestId: number) => void
  processing: number | null
}

export function VendorPayoutCard({
  req,
  formatCurrency,
  getStatusBadge,
  onApprove,
  onAuthorize,
  processing,
}: Props) {
  return (
    <Card className="p-6 rounded-[32px] border-slate-100 flex flex-col justify-between gap-4 h-full min-h-[200px]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-14 w-14 shrink-0 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic">
          {req.vendor_name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.event_name}</p>
          <h4 className="font-black text-slate-900 text-lg tracking-tight truncate">{req.vendor_name}</h4>
          <p className="text-sm text-slate-500 italic mt-0.5 line-clamp-2">"{req.description}"</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-100/80 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(req.amount)}</p>
          {getStatusBadge(req.status)}
        </div>
        <div className="flex flex-wrap gap-2">
          {req.status === "pending" && (
            <Button
              onClick={() => onApprove(req.id)}
              size="sm"
              className="h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100 border transition-all font-black text-[10px] uppercase"
            >
              Approve
            </Button>
          )}
          {req.status === "approved" && (
            <Button
              onClick={() => onAuthorize(req.event_id, req.amount, req.id)}
              className="h-12 px-5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 w-full sm:w-auto"
            >
              {processing === req.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />}
              Authorize Settlement
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
