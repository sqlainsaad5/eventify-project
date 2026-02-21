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
  organizer_id?: number | null
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

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<OrganizerPaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"payments" | "requests" | "organizer">("payments")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [currentClientSecret, setCurrentClientSecret] = useState("")
  const [currentAmount, setCurrentAmount] = useState(0)
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null)
  const [organizerForm, setOrganizerForm] = useState({ event_id: "", amount: "", description: "Coordination fee" })
  const [organizerSubmitting, setOrganizerSubmitting] = useState(false)

  const getToken = () => localStorage.getItem("token")?.replace(/['"]+/g, '').trim()
  const getUserId = (): number | null => {
    try {
      const u = localStorage.getItem("user")
      if (!u) return null
      const parsed = JSON.parse(u)
      return parsed?.id ?? parsed?._id ?? null
    } catch { return null }
  }

  // Clear organizer form event selection if that event is already paid (e.g. after refetch)
  useEffect(() => {
    const paidEventIds = organizerRequests.filter((r) => r.status === "paid").map((r) => r.event_id)
    if (organizerForm.event_id && paidEventIds.includes(parseInt(organizerForm.event_id, 10))) {
      setOrganizerForm((f) => ({ ...f, event_id: "" }))
    }
  }, [organizerRequests])

  const loadData = async () => {
    const token = getToken()
    if (!token) return router.push("/login")

    try {
      setLoading(true)
      const [eventsRes, paymentsRes, requestsRes, orgRequestsRes] = await Promise.all([
        fetch("http://localhost:5000/api/payments/events-with-payment-status", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/payments", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/payments/requests", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/payments/organizer-requests", { headers: { "Authorization": `Bearer ${token}` } })
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
      if (orgRequestsRes.ok) {
        const d = await orgRequestsRes.json()
        setOrganizerRequests(d.organizer_requests || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleCreatePayment = async (eventId: number, amount: number, requestId?: number, organizerRequestId?: number) => {
    const token = getToken()
    if (!token) return
    setProcessing(organizerRequestId ?? requestId ?? eventId)
    try {
      const body: Record<string, unknown> = { event_id: eventId, amount }
      if (requestId != null) body.request_id = requestId
      if (organizerRequestId != null) body.organizer_request_id = organizerRequestId
      const res = await fetch("http://localhost:5000/api/payments/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentClientSecret(data.clientSecret)
        setCurrentAmount(amount)
        setCurrentPaymentId(data.payment_id)
        setIsCheckoutOpen(true)
      } else {
        alert(data.error || "Failed to create payment")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectOrganizerRequest = async (id: number) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`http://localhost:5000/api/payments/organizer-requests/${id}/reject`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (res.ok) loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmitOrganizerRequest = async () => {
    const token = getToken()
    const eid = organizerForm.event_id ? parseInt(organizerForm.event_id) : 0
    const amount = parseFloat(organizerForm.amount)
    if (!token || !eid || !amount || amount <= 0) return
    setOrganizerSubmitting(true)
    try {
      const res = await fetch("http://localhost:5000/api/payments/organizer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          event_id: eid,
          amount,
          description: organizerForm.description || "Coordination fee"
        })
      })
      if (res.ok) {
        setOrganizerForm({ event_id: "", amount: "", description: "Coordination fee" })
        loadData()
      } else {
        const d = await res.json()
        alert(d.error || "Failed to submit request")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setOrganizerSubmitting(false)
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

        <div className="flex gap-2 bg-white p-2 rounded-[24px] border border-slate-100 max-w-md">
          <button onClick={() => setActiveTab("payments")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "payments" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}>Projects</button>
          <button onClick={() => setActiveTab("requests")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "requests" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}>Vendor</button>
          <button onClick={() => setActiveTab("organizer")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "organizer" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}>Organizer</button>
        </div>

        {activeTab === "payments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const userId = getUserId()
              const organizerPaid = userId != null && event.organizer_id === userId && organizerRequests.some((r: OrganizerPaymentRequest) => r.event_id === event.id && r.status === "paid")
              return (
              <Card key={event.id} className={`rounded-[32px] border-slate-100 shadow-sm overflow-hidden p-6 transition-all border group ${organizerPaid ? "opacity-85 border-slate-200 hover:shadow-lg" : "hover:shadow-2xl hover:border-purple-200"}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">{event.name}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {organizerPaid && (
                      <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Paid</Badge>
                    )}
                    {getPaymentStatusBadge(event.payment_status)}
                  </div>
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
            )})}
          </div>
        )}
        {activeTab === "requests" && (
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
        {activeTab === "organizer" && (
          <div className="space-y-6">
            {(() => {
              const userId = getUserId()
              const myEventsAsOwner = events.filter((e: any) => e.user_id === userId)
              const myEventsAsOrganizer = events.filter(
                (e: any) => e.organizer_id === userId && !organizerRequests.some((r: any) => r.event_id === e.id && r.status === "paid")
              )
              const pendingForMe = organizerRequests.filter(
                (r) => r.status === "pending" && myEventsAsOwner.some((e: any) => e.id === r.event_id)
              )
              const myRequestsAsOrganizer = organizerRequests.filter((r) => r.organizer_id === userId)
              return (
                <>
                  {pendingForMe.length > 0 && (
                    <Card className="p-6 rounded-[32px] border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Requests from organizer (pay now)</h3>
                      <div className="space-y-4">
                        {pendingForMe.map((r) => (
                          <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{r.event_name}</p>
                              <p className="font-bold text-slate-900">{r.organizer_name}</p>
                              <p className="text-sm text-slate-500">{r.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black text-slate-900">{formatCurrency(r.amount)}</span>
                              <Button
                                onClick={() => handleCreatePayment(r.event_id, r.amount, undefined, r.id)}
                                disabled={processing === r.id}
                                className="h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase"
                              >
                                {processing === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay"}
                              </Button>
                              <Button variant="outline" size="sm" className="h-10 rounded-xl text-red-600" onClick={() => handleRejectOrganizerRequest(r.id)}>Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {myEventsAsOrganizer.length > 0 && (
                    <Card className="p-6 rounded-[32px] border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Request payment from client</h3>
                      <div className="flex flex-wrap gap-3 items-end mb-6">
                        <select
                          value={organizerForm.event_id}
                          onChange={(e) => setOrganizerForm((f) => ({ ...f, event_id: e.target.value }))}
                          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium min-w-[180px]"
                        >
                          <option value="">Select event</option>
                          {myEventsAsOrganizer.map((e: any) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={organizerForm.amount}
                          onChange={(e) => setOrganizerForm((f) => ({ ...f, amount: e.target.value }))}
                          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium w-28"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={organizerForm.description}
                          onChange={(e) => setOrganizerForm((f) => ({ ...f, description: e.target.value }))}
                          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium flex-1 min-w-[160px]"
                        />
                        <Button onClick={handleSubmitOrganizerRequest} disabled={organizerSubmitting || !organizerForm.event_id || !organizerForm.amount} className="h-11 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase">
                          {organizerSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Your requests</p>
                      <div className="mt-2 space-y-2">
                        {myRequestsAsOrganizer.length === 0 ? (
                          <p className="text-sm text-slate-500">No requests yet.</p>
                        ) : (
                          myRequestsAsOrganizer.map((r) => (
                            <div key={r.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                              <span className="font-medium text-slate-800">{r.event_name} — {formatCurrency(r.amount)}</span>
                              <Badge className={r.status === "paid" ? "bg-emerald-100 text-emerald-700 font-semibold" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                                {r.status === "paid" ? "Paid" : r.status === "rejected" ? "Rejected" : "Pending"}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  )}
                  {pendingForMe.length === 0 && myEventsAsOrganizer.length === 0 && (
                    <div className="text-center p-20 bg-slate-50 rounded-[40px] border-dashed border-2 border-slate-200">
                      <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No organizer payment requests</p>
                    </div>
                  )}
                </>
              )
            })()}
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