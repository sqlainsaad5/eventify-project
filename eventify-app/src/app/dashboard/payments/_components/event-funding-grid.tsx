"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { Event } from "../_lib/payment-workflow-types"
import { ReactNode } from "react"

type Props = {
  events: Event[]
  getUserId: () => number | null
  formatCurrency: (n: number) => string
  getPaymentStatusBadge: (status: string) => ReactNode
  onPay25: (eventId: number, amount: number) => void
  processing: number | null
}

export function EventFundingGrid({
  events,
  getUserId,
  formatCurrency,
  getPaymentStatusBadge,
  onPay25,
  processing,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        const userId = getUserId()
        const organizerAdvancePaid = !!event.organizer_advance_paid
        const organizerFinalPaid = !!event.organizer_final_paid
        const organizerFullyPaid =
          userId != null && event.organizer_id === userId && organizerAdvancePaid && organizerFinalPaid
        return (
          <Card
            key={event.id}
            className={`rounded-[32px] border-slate-100 shadow-sm overflow-hidden p-6 transition-all border group ${
              organizerFullyPaid ? "opacity-85 border-slate-200 hover:shadow-lg" : "hover:shadow-2xl hover:border-purple-200"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-slate-900 uppercase tracking-tight">{event.name}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {organizerFullyPaid && (
                  <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Fully Paid</Badge>
                )}
                {getPaymentStatusBadge(event.payment_status)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Stripe Funding</span>
                <span>{formatCurrency(event.budget)}</span>
              </div>
              <Progress
                value={event.budget > 0 && event.total_spent != null ? Math.min(100, (event.total_spent / event.budget) * 100) : 0}
                className="h-2 bg-slate-50"
              />
              {event.payment_status === "unpaid" ? (
                <Button
                  onClick={() => onPay25(event.id, event.budget * 0.25)}
                  className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest"
                >
                  {processing === event.id ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Pay 25% Advance
                </Button>
              ) : (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100 italic font-bold text-sm">
                  <CheckCircle className="h-4 w-4" /> 25% Advance Paid
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
