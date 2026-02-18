"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  History,
  Briefcase,
  ShieldCheck,
  CreditCard,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { StripeCheckoutModal } from "@/components/stripe-checkout-modal"

interface Payment {
  id: number
  event_id: number
  amount: number
  currency: string
  status: string
  payment_method: string
  transaction_id: string
  payment_date: string
  created_at: string
  event_name: string
}

interface Event {
  id: number
  name: string
  budget: number
  payment_status: "unpaid" | "deposit_paid" | "partially_paid" | "fully_paid"
  deposit_amount?: number
  vendor_payments_total?: number
}

interface PaymentRequest {
  id: number
  event_id: number
  vendor_id: number
  vendor_name: string
  amount: number
  status: "pending" | "approved" | "rejected" | "paid"
  description: string
  created_at: string
  event_name: string
}

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"payments" | "requests">("payments")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [currentClientSecret, setCurrentClientSecret] = useState("")
  const [currentAmount, setCurrentAmount] = useState(0)
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null)

  const getToken = () => localStorage.getItem("token")?.replace(/['"]+/g, '').trim()

  const loadData = async () => {
    const token = getToken()
    if (!token) return router.push("/login")

    try {
      setLoading(true)
      const [eventsRes, paymentsRes, requestsRes] = await Promise.all([
        fetch("http://localhost:5000/api/payments/events-with-payment-status", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/payments", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/payments/requests", { headers: { "Authorization": `Bearer ${token}` } })
      ])

      if (eventsRes.ok) setEvents(await eventsRes.json())
      if (paymentsRes.ok) {
        const d = await paymentsRes.json()
        setPayments(d.payments || [])
      }
      if (requestsRes.ok) {
        const d = await requestsRes.json()
        setPaymentRequests(d.requests || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleCreatePayment = async (eventId: number, amount: number, requestId?: number) => {
    const token = getToken()
    if (!token) return
    setProcessing(requestId || eventId)
    try {
      const res = await fetch("http://localhost:5000/api/payments/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ event_id: eventId, amount, request_id: requestId })
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentClientSecret(data.clientSecret)
        setCurrentAmount(amount)
        setCurrentPaymentId(data.payment_id)
        setIsCheckoutOpen(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  const handleApprove = async (rid: number) => {
    const token = getToken()
    await fetch(`http://localhost:5000/api/payments/requests/${rid}/approve`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` } })
    loadData()
  }

  const handleReject = async (rid: number) => {
    const token = getToken()
    await fetch(`http://localhost:5000/api/payments/requests/${rid}/reject`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` } })
    loadData()
  }

  const handleStripeSuccess = async (paymentIntent: any) => {
    const token = getToken()
    if (currentPaymentId) {
      await fetch(`http://localhost:5000/api/payments/authorize-verify/${currentPaymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ payment_intent: paymentIntent.id })
      })
    }
    setIsCheckoutOpen(false)
    alert("✅ Stripe Authorization Complete. Your liquidity status has been updated.")
    loadData()
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      unpaid: "bg-slate-100 text-slate-500 border-slate-200",
      deposit_paid: "bg-purple-100 text-purple-700 border-purple-200",
      partially_paid: "bg-amber-100 text-amber-700 border-amber-200",
      fully_paid: "bg-emerald-100 text-emerald-700 border-emerald-200"
    }
    const labels = {
      unpaid: "Awaiting Deposit",
      deposit_paid: "Deposit Settled",
      partially_paid: "Pipeline Active",
      fully_paid: "Financial Closure"
    }
    const key = status as keyof typeof styles
    return (
      <Badge className={`${styles[key] || styles.unpaid} border text-[9px] font-black uppercase tracking-widest`}>
        {labels[key] || status}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-slate-100 text-slate-500 border-slate-200",
      approved: "bg-blue-50 text-blue-600 border-blue-100",
      rejected: "bg-red-50 text-red-600 border-red-100",
      paid: "bg-emerald-100 text-emerald-700 border-emerald-200"
    }
    const labels = {
      pending: "In Review",
      approved: "Authorized",
      rejected: "Declined",
      paid: "Settled"
    }
    const key = status as keyof typeof styles
    return (
      <Badge className={`${styles[key] || styles.pending} border text-[9px] font-black uppercase tracking-widest`}>
        {labels[key] || status}
      </Badge>
    )
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="animate-spin text-slate-900 w-12 h-12" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Stripe Accounts...</p>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="space-y-8 p-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Payments Hub</h1>
            <p className="text-slate-500 font-medium">Verified by Stripe Infrastructure</p>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text">Production Test Active</span>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-[24px] border border-slate-100 max-w-sm">
          <button onClick={() => setActiveTab("payments")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "payments" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}>Projects</button>
          <button onClick={() => setActiveTab("requests")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "requests" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}>Requests</button>
        </div>

        {activeTab === "payments" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <Card key={event.id} className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden p-6 hover:shadow-2xl transition-all border hover:border-purple-200 group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">{event.name}</h3>
                  {getPaymentStatusBadge(event.payment_status)}
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Stripe Funding</span>
                    <span>{formatCurrency(event.budget)}</span>
                  </div>
                  <Progress value={(event.vendor_payments_total || 0) + (event.deposit_amount || 0) > 0 ? 50 : 0} className="h-2 bg-slate-50" />

                  {event.payment_status === "unpaid" ? (
                    <Button onClick={() => handleCreatePayment(event.id, event.budget * 0.25)} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                      {processing === event.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Pay Stripe Deposit
                    </Button>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100 italic font-bold text-sm">
                      <CheckCircle className="h-4 w-4" /> Deposit Active
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {paymentRequests.length === 0 ? (
              <div className="text-center p-20 bg-slate-50 rounded-[40px] border-dashed border-2 border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending settlements</p>
              </div>
            ) : (
              paymentRequests.map(req => (
                <Card key={req.id} className="p-6 rounded-[32px] border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic">
                      {req.vendor_name[0]}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.event_name}</p>
                      <h4 className="font-black text-slate-900 text-lg tracking-tight">{req.vendor_name}</h4>
                      <p className="text-sm text-slate-500 italic mt-0.5">"{req.description}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(req.amount)}</p>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex gap-2">
                      {req.status === "pending" && (
                        <>
                          <Button onClick={() => handleApprove(req.id)} size="sm" className="h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100 border transition-all font-black text-[10px] uppercase">Approve</Button>
                          <Button onClick={() => handleReject(req.id)} size="sm" variant="ghost" className="h-10 rounded-xl text-red-500 font-black text-[10px] uppercase">Reject</Button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <Button onClick={() => handleCreatePayment(req.event_id, req.amount, req.id)} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200">
                          {processing === req.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />}
                          Authorize Settlement
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <History className="h-3 w-3" /> Transaction History
          </h3>
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                    <CreditCard className="h-4 w-4 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{p.event_name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.transaction_id || 'STRIPE_PIPELINE'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-sm">+{formatCurrency(p.amount)}</p>
                  <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 min-w-12 flex justify-center uppercase font-black">{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <StripeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          clientSecret={currentClientSecret}
          amount={currentAmount}
          onSuccess={handleStripeSuccess}
        />
      </div>
    </DashboardLayout>
  )
}