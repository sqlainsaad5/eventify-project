"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, DollarSign, Briefcase, History, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { StripeCheckoutModal } from "@/components/stripe-checkout-modal"
import { ReviewDialog } from "@/components/review-dialog"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface OrganizerPaymentRequest {
  id: number
  event_id: number
  event_name: string
  organizer_id: number
  organizer_name: string
  amount: number
  currency: string
  description: string
  status: "pending" | "paid" | "rejected"
  created_at: string
  paid_at: string | null
}

interface PaymentRecord {
  id: number
  event_id: number
  event_name: string
  amount: number
  status: string
  created_at: string | null
  payment_type?: string | null
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount)

const organizerAdvanceLabel = (status: OrganizerPaymentRequest["status"]) => {
  switch (status) {
    case "pending":
      return "Advance 25% requested"
    case "paid":
      return "Advance 25% paid"
    case "rejected":
      return "Advance 25% rejected"
    default:
      return status
  }
}

const requestPhaseLabel = (request: OrganizerPaymentRequest) => {
  const description = (request.description || "").toLowerCase()
  if (description.includes("75%") || description.includes("final")) {
    return "Final 75%"
  }
  if (description.includes("25%") || description.includes("advance")) {
    return "Advance 25%"
  }
  return "Organizer Fee"
}

export default function MyEventsPaymentsPage() {
  const router = useRouter()
  const [organizerRequests, setOrganizerRequests] = useState<OrganizerPaymentRequest[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [currentClientSecret, setCurrentClientSecret] = useState("")
  const [currentAmount, setCurrentAmount] = useState(0)
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null)
  const [organizerRatingPrompt, setOrganizerRatingPrompt] = useState<{
    eventId: number
    organizerId: number
    organizerName: string
    eventName: string
  } | null>(null)

  const getToken = () => localStorage.getItem("token")?.replace(/['"]+/g, "").trim()

  const loadData = async () => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoading(true)
      const [requestsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments/organizer-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setOrganizerRequests(data.organizer_requests || [])
      } else {
        toast.error("Failed to load payment requests")
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(data.payments || [])
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load payment requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login")
      return
    }
    loadData()
  }, [])

  const pendingRequests = organizerRequests.filter((r) => r.status === "pending")

  const handleCreatePayment = async (
    eventId: number,
    amount: number,
    organizerRequestId: number
  ) => {
    const token = getToken()
    if (!token) return
    setProcessing(organizerRequestId)
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          amount,
          organizer_request_id: organizerRequestId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentClientSecret(data.clientSecret)
        setCurrentAmount(amount)
        setCurrentPaymentId(data.payment_id ?? null)
        setIsCheckoutOpen(true)
      } else {
        toast.error(data.error || "Failed to create payment")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to create payment")
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectOrganizerRequest = async (id: number) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(
        `${API_BASE}/api/payments/organizer-requests/${id}/reject`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (res.ok) {
        toast.success("Request rejected")
        loadData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to reject")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to reject request")
    }
  }

  const handleStripeSuccess = async (paymentIntent: { id: string }) => {
    const token = getToken()
    let prompt: {
      event_id: number
      organizer_id: number
      organizer_name?: string
      event_name?: string
    } | null = null
    if (currentPaymentId && token) {
      const verifyRes = await fetch(
        `${API_BASE}/api/payments/authorize-verify/${currentPaymentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ payment_intent: paymentIntent.id }),
        }
      )
      const verifyJson = await verifyRes.json().catch(() => ({}))
      if (verifyRes.ok && verifyJson.prompt_user_review_organizer) {
        prompt = verifyJson.prompt_user_review_organizer
      }
    }
    setIsCheckoutOpen(false)
    setCurrentClientSecret("")
    setCurrentAmount(0)
    setCurrentPaymentId(null)
    toast.success("Payment completed")
    await loadData()
    if (prompt?.event_id && prompt?.organizer_id) {
      setOrganizerRatingPrompt({
        eventId: prompt.event_id,
        organizerId: prompt.organizer_id,
        organizerName: prompt.organizer_name || "Organizer",
        eventName: prompt.event_name || "",
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div
        className="py-16 text-center text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)",
        }}
      >
        <div className="relative z-10 container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            Organizer Payments
          </h1>
          <p className="text-lg text-white/70 font-medium max-w-xl mx-auto">
            Review and settle organizer fee requests (Advance 25% and Final 75%).
          </p>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Card className="p-5 rounded-[24px] border-slate-100 mb-6 bg-white">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-3">
            How Organizer Payments Work
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">Advance 25%: Requested first to start work</div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">Final 75%: Requested after event completion</div>
          </div>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
              Loading payment requests...
            </p>
          </div>
        ) : pendingRequests.length > 0 ? (
          <Card className="p-6 rounded-[32px] border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Organizer Fee Requests (Pay Now)
            </h3>
            <div className="space-y-4">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      {r.event_name}
                    </p>
                    <p className="font-bold text-slate-900">{r.organizer_name}</p>
                    <p className="text-sm text-slate-500">{r.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                        {requestPhaseLabel(r)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                        {organizerAdvanceLabel(r.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-slate-900">
                      {formatCurrency(r.amount)}
                    </span>
                    <Button
                      onClick={() =>
                        handleCreatePayment(r.event_id, r.amount, r.id)
                      }
                      disabled={processing === r.id}
                      className="h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase"
                    >
                      {processing === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Pay Now"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl text-red-600"
                      onClick={() => handleRejectOrganizerRequest(r.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="text-center p-20 bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              No pending organizer payment requests
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Advance 25% and Final 75% requests from your organizer will appear here.
            </p>
            <Link href="/my-events">
              <Button
                variant="outline"
                className="mt-6 rounded-xl font-black text-[10px] uppercase"
              >
                Back to My Events
              </Button>
            </Link>
          </div>
        )}

        <Card className="p-6 rounded-[32px] border-slate-100 mt-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <History className="h-4 w-4" />
            Organizer Payment History
          </h3>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments yet.</p>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <CreditCard className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                        {p.event_name}
                      </p>
                      {(p.payment_type === "organizer" || p.payment_type === "organizer_advance" || p.payment_type === "organizer_final") && (
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          {p.payment_type === "organizer_final"
                            ? "Organizer final 75% paid"
                            : p.payment_type === "organizer_advance"
                              ? "Organizer advance 25% paid"
                              : "Payment to organizer"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{formatCurrency(p.amount)}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <StripeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false)
            setCurrentClientSecret("")
            setCurrentAmount(0)
            setCurrentPaymentId(null)
          }}
          clientSecret={currentClientSecret}
          amount={currentAmount}
          onSuccess={handleStripeSuccess}
        />

        <ReviewDialog
          open={organizerRatingPrompt !== null}
          onOpenChange={(open) => {
            if (!open) setOrganizerRatingPrompt(null)
          }}
          variant="professional"
          title={
            organizerRatingPrompt
              ? `Rate ${organizerRatingPrompt.organizerName}`
              : "Rate your organizer"
          }
          description={
            organizerRatingPrompt
              ? `Your final payment for “${organizerRatingPrompt.eventName}” is complete. Your rating helps other hosts choose organizers.`
              : undefined
          }
          onSubmit={async (rating, comment) => {
            if (!organizerRatingPrompt) return
            const t = getToken()
            if (!t) {
              toast.error("Please sign in again")
              return
            }
            const res = await fetch(
              `${API_BASE}/api/events/${organizerRatingPrompt.eventId}/reviews`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${t}`,
                },
                body: JSON.stringify({
                  review_type: "user_to_organizer",
                  subject_id: organizerRatingPrompt.organizerId,
                  rating,
                  comment: comment || undefined,
                }),
              }
            )
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              toast.error(data.error || "Could not submit review")
              throw new Error(data.error || "submit failed")
            }
            toast.success("Thanks — your feedback was saved.")
            setOrganizerRatingPrompt(null)
            loadData()
          }}
        />
      </main>
    </div>
  )
}
