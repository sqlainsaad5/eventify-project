"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, History, Briefcase, ShieldCheck } from "lucide-react"
import { StripeCheckoutModal } from "@/components/stripe-checkout-modal"
import { ReviewDialog } from "@/components/review-dialog"
import { toast } from "sonner"
import { usePaymentWorkflowData } from "./_lib/use-payment-workflow-data"
import { DASHBOARD_PAYMENT_PREVIEW_LIMIT } from "./_lib/constants"
import {
  sortEventsForFundingRecent,
  sortPaymentRequestsRecent,
  sortEventsByIdDesc,
  sortOrganizerPaymentRequestsRecent,
} from "./_lib/payment-sort-helpers"
import { PaymentWorkflowSectionHeader } from "./_components/payment-workflow-section-header"
import { EventFundingGrid } from "./_components/event-funding-grid"
import { VendorPayoutCard } from "./_components/vendor-payout-card"
import { TransactionHistoryDialog } from "./_components/transaction-history-dialog"
import type { AppNotification } from "./_lib/payment-workflow-types"

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    payments,
    events,
    paymentRequests,
    organizerRequests,
    loadData,
    loading,
    notifications,
    API_BASE,
    getToken,
  } = usePaymentWorkflowData()
  const allParam = searchParams.get("all")
  const showAllFunding = allParam === "funding"
  const showAllPayouts = allParam === "payouts"
  const showAllOrganizer = allParam === "organizer"
  const eventsSorted = useMemo(
    () => [...events].sort(sortEventsForFundingRecent),
    [events]
  )
  const eventsPreview = useMemo(
    () => (showAllFunding ? eventsSorted : eventsSorted.slice(0, DASHBOARD_PAYMENT_PREVIEW_LIMIT)),
    [showAllFunding, eventsSorted]
  )
  const paymentRequestsSorted = useMemo(
    () => [...paymentRequests].sort(sortPaymentRequestsRecent),
    [paymentRequests]
  )
  const paymentRequestsPreview = useMemo(
    () =>
      showAllPayouts
        ? paymentRequestsSorted
        : paymentRequestsSorted.slice(0, DASHBOARD_PAYMENT_PREVIEW_LIMIT),
    [showAllPayouts, paymentRequestsSorted]
  )
  const [processing, setProcessing] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"payments" | "requests" | "organizer">("payments")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [currentClientSecret, setCurrentClientSecret] = useState("")
  const [currentAmount, setCurrentAmount] = useState(0)
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null)
  const [completingEventId, setCompletingEventId] = useState<number | null>(null)
  const [organizerRatingPrompt, setOrganizerRatingPrompt] = useState<{
    eventId: number
    organizerId: number
    organizerName: string
    eventName: string
  } | null>(null)
  const [vendorRatingPrompt, setVendorRatingPrompt] = useState<{
    eventId: number
    vendorId: number
    vendorName: string
    eventName: string
  } | null>(null)
  const [transactionHistoryOpen, setTransactionHistoryOpen] = useState(false)

  const getUserId = (): number | null => {
    try {
      const u = localStorage.getItem("user")
      if (!u) return null
      const parsed = JSON.parse(u)
      return parsed?.id ?? parsed?._id ?? null
    } catch { return null }
  }

  useEffect(() => {
    const tab = searchParams.get("tab")
    const all = searchParams.get("all")
    if (all === "funding" && !tab) {
      router.replace("/dashboard/payments?tab=payments&all=funding", { scroll: false })
      return
    }
    if (all === "payouts" && !tab) {
      router.replace("/dashboard/payments?tab=requests&all=payouts", { scroll: false })
      return
    }
    if (all === "organizer" && !tab) {
      router.replace("/dashboard/payments?tab=organizer&all=organizer", { scroll: false })
      return
    }
    if (tab === "organizer" || tab === "payments" || tab === "requests") {
      setActiveTab(tab)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (activeTab !== "organizer") return
    const token = getToken()
    if (!token) return
    fetch(`${API_BASE}/api/payments/notifications/mark-read-by-action`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "organizer_payment_followup" }),
    })
      .then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
      })
      .catch(() => {})
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "requests") return
    const token = getToken()
    if (!token) return
    fetch(`${API_BASE}/api/payments/notifications/mark-read-by-action`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "vendor_payout_request" }),
    })
      .then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
      })
      .catch(() => {})
  }, [activeTab])

  const handleCreatePayment = async (eventId: number, amount: number, requestId?: number, organizerRequestId?: number) => {
    const token = getToken()
    if (!token) return
    setProcessing(organizerRequestId ?? requestId ?? eventId)
    try {
      const body: Record<string, unknown> = { event_id: eventId, amount }
      if (requestId != null) body.request_id = requestId
      if (organizerRequestId != null) body.organizer_request_id = organizerRequestId
      const res = await fetch(`${API_BASE}/api/payments/create-payment-intent`, {
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
      const res = await fetch(`${API_BASE}/api/payments/organizer-requests/${id}/reject`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (res.ok) {
        toast.success("Payment rejected by user")
        loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to reject payment request")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error rejecting payment request")
    }
  }

  const handleApprove = async (rid: number) => {
    const token = getToken()
    await fetch(`${API_BASE}/api/payments/requests/${rid}/approve`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` } })
    loadData()
  }

  const handleReject = async (rid: number) => {
    const token = getToken()
    await fetch(`${API_BASE}/api/payments/requests/${rid}/reject`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` } })
    loadData()
  }

  const handleStripeSuccess = async (paymentIntent: any) => {
    const token = getToken()
    let prompt: {
      event_id: number
      organizer_id: number
      organizer_name?: string
      event_name?: string
    } | null = null
    let vendorPrompt: {
      event_id: number
      vendor_id: number
      vendor_name?: string
      event_name?: string
    } | null = null
    if (currentPaymentId && token) {
      const verifyRes = await fetch(`${API_BASE}/api/payments/authorize-verify/${currentPaymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payment_intent: paymentIntent.id }),
      })
      const verifyJson = await verifyRes.json().catch(() => ({}))
      if (verifyRes.ok && verifyJson.prompt_user_review_organizer) {
        prompt = verifyJson.prompt_user_review_organizer
      }
      if (verifyRes.ok && verifyJson.prompt_vendor_review) {
        vendorPrompt = verifyJson.prompt_vendor_review
      }
    }
    setIsCheckoutOpen(false)
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
    if (vendorPrompt?.event_id && vendorPrompt?.vendor_id) {
      setVendorRatingPrompt({
        eventId: vendorPrompt.event_id,
        vendorId: vendorPrompt.vendor_id,
        vendorName: vendorPrompt.vendor_name || "Vendor",
        eventName: vendorPrompt.event_name || "",
      })
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount)

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

  const vendorPayoutActionCount = notifications.filter(
    (n) => !n.is_read && n.extra_data?.action === "vendor_payout_request"
  ).length

  const organizerFeeActionCount = notifications.filter(
    (n) =>
      !n.is_read &&
      (n.extra_data?.action === "organizer_payment_followup" || n.extra_data?.category === "organizer_fee")
  ).length

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Payment Workflow</h1>
            <p className="text-slate-500 font-medium">25% advance, completion, and 75% final settlement</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTransactionHistoryOpen(true)}
              className="h-11 gap-2 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest"
            >
              <History className="h-4 w-4" />
              View Transaction History
            </Button>
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Production Test Active</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-[24px] border border-slate-100 max-w-md">
          <button
            onClick={() => router.push("/dashboard/payments?tab=payments", { scroll: false })}
            className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "payments" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}
          >
            Event Funding
          </button>
          <button
            onClick={() => router.push("/dashboard/payments?tab=requests", { scroll: false })}
            className={`relative flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "requests" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}
          >
            Vendor Payouts
            {vendorPayoutActionCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === "requests" ? "bg-white text-slate-900" : "bg-amber-500 text-white"}`}>
                {vendorPayoutActionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push("/dashboard/payments?tab=organizer", { scroll: false })}
            className={`relative flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "organizer" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}
          >
            Organizer Fees
            {organizerFeeActionCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === "organizer" ? "bg-white text-slate-900" : "bg-violet-600 text-white"}`}>
                {organizerFeeActionCount}
              </span>
            )}
          </button>
        </div>

        <Card className="rounded-[24px] border-slate-100 shadow-sm">
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
              Organizer Payment Flow
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 1</p>
                <p className="text-xs font-bold text-slate-800">Pay 25% advance</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 2</p>
                <p className="text-xs font-bold text-slate-800">Work completed</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 3</p>
                <p className="text-xs font-bold text-slate-800">Request 75% final</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 4</p>
                <p className="text-xs font-bold text-slate-800">Client pays 75%</p>
              </div>
            </div>
          </div>
        </Card>

        {activeTab === "payments" && (
          <div className="space-y-4">
            <PaymentWorkflowSectionHeader
              title="Event funding"
              showViewAll={!showAllFunding && eventsSorted.length > DASHBOARD_PAYMENT_PREVIEW_LIMIT}
              href="/dashboard/payments?tab=payments&all=funding"
            />
            <EventFundingGrid
              events={eventsPreview}
              getUserId={getUserId}
              formatCurrency={formatCurrency}
              getPaymentStatusBadge={getPaymentStatusBadge}
              onPay25={(eventId, amount) => handleCreatePayment(eventId, amount)}
              processing={processing}
            />
          </div>
        )}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {vendorPayoutActionCount > 0 && (
              <Card className="p-4 rounded-2xl border-amber-200 bg-amber-50/70">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Action required
                </p>
                <p className="text-sm font-semibold text-amber-900 mt-1">
                  You have {vendorPayoutActionCount} new vendor payout request{vendorPayoutActionCount > 1 ? "s" : ""} to review.
                </p>
              </Card>
            )}
            <PaymentWorkflowSectionHeader
              title="Vendor payout requests"
              showViewAll={!showAllPayouts && paymentRequestsSorted.length > DASHBOARD_PAYMENT_PREVIEW_LIMIT}
              href="/dashboard/payments?tab=requests&all=payouts"
            />
            {paymentRequests.length === 0 ? (
              <div className="text-center p-20 bg-slate-50 rounded-[40px] border-dashed border-2 border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending vendor payouts</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paymentRequestsPreview.map((req) => (
                  <VendorPayoutCard
                    key={req.id}
                    req={req}
                    formatCurrency={formatCurrency}
                    getStatusBadge={getStatusBadge}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onAuthorize={(eventId, amount, requestId) => handleCreatePayment(eventId, amount, requestId)}
                    processing={processing}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "organizer" && (
          <div className="space-y-6">
            {(() => {
              const userId = getUserId()
              const myEventsAsOwner = events.filter((e: any) => e.user_id === userId)
              const myEventsAsOrganizer = events.filter((e: any) => e.organizer_id === userId)

              // Derive organizer payment workflow stages for events where I'm the organizer
              const advancePaidEvents = myEventsAsOrganizer.filter(
                (e: any) => e.organizer_advance_paid && !e.organizer_final_paid
              )
              const pendingFinalEvents = myEventsAsOrganizer.filter(
                (e: any) => e.organizer_final_requested && !e.organizer_final_paid
              )
              const fullyPaidEvents = myEventsAsOrganizer.filter(
                (e: any) => e.organizer_advance_paid && e.organizer_final_paid
              )
              const findFinalRequestForEvent = (eventId: number) => {
                const ev = events.find((e: any) => e.id === eventId)
                if (!ev || !ev.budget) return null
                const finalAmount = Math.round(ev.budget * 0.75 * 100) / 100
                return organizerRequests
                  .filter((r) => r.organizer_id === userId && r.event_id === eventId)
                  .find((r) => Math.abs(r.amount - finalAmount) < 0.01)
              }

              const pendingForMe = organizerRequests.filter(
                (r) => r.status === "pending" && myEventsAsOwner.some((e: any) => e.id === r.event_id)
              )
              const myRequestsAsOrganizer = organizerRequests.filter((r) => r.organizer_id === userId)
              const L = DASHBOARD_PAYMENT_PREVIEW_LIMIT
              const oFull = showAllOrganizer
              const orgAllHref = "/dashboard/payments?tab=organizer&all=organizer"
              const advanceSorted = [...advancePaidEvents].sort(sortEventsByIdDesc)
              const advanceToShow = oFull ? advanceSorted : advanceSorted.slice(0, L)
              const showAdvanceViewAll = !oFull && advanceSorted.length > L
              const pendingFinalSorted = [...pendingFinalEvents].sort(sortEventsByIdDesc)
              const pendingFinalToShow = oFull ? pendingFinalSorted : pendingFinalSorted.slice(0, L)
              const showPendingFinalViewAll = !oFull && pendingFinalSorted.length > L
              const fullySorted = [...fullyPaidEvents].sort(sortEventsByIdDesc)
              const fullyToShow = oFull ? fullySorted : fullySorted.slice(0, L)
              const showFullyViewAll = !oFull && fullySorted.length > L
              const pendingForMeSorted = [...pendingForMe].sort(sortOrganizerPaymentRequestsRecent)
              const pendingForMeToShow = oFull ? pendingForMeSorted : pendingForMeSorted.slice(0, L)
              const showPendingForMeViewAll = !oFull && pendingForMeSorted.length > L
              const myReqSorted = [...myRequestsAsOrganizer].sort(sortOrganizerPaymentRequestsRecent)
              const myReqToShow = oFull ? myReqSorted : myReqSorted.slice(0, L)
              const showMyReqViewAll = !oFull && myReqSorted.length > L
              return (
                <>
                  {/* Organizer payment workflow sections */}
                  {myEventsAsOrganizer.length > 0 && (
                    <div className="space-y-6">
                      {advanceSorted.length > 0 && (
                        <Card className="p-6 rounded-[32px] border-slate-100 bg-emerald-50/40">
                          <PaymentWorkflowSectionHeader
                            title="25% advance paid – work in progress"
                            showViewAll={showAdvanceViewAll}
                            href={orgAllHref}
                          />
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {advanceToShow.map((e: any) => (
                              (() => {
                                const finalReq = findFinalRequestForEvent(e.id)
                                const canRequestFinal =
                                  e.status === "completed" &&
                                  (!finalReq || finalReq.status === "rejected")
                                const hasPendingFinalReq = finalReq?.status === "pending"
                                const hasRejectedFinalReq = finalReq?.status === "rejected"
                                return (
                              <div
                                key={e.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-emerald-100"
                              >
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {e.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    25% advance has been paid. Complete the event, then request the remaining 75%.
                                  </p>
                                  {e.status !== "completed" && (
                                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                      Complete the event to unlock the 75% final request.
                                    </p>
                                  )}
                                  {hasPendingFinalReq && (
                                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                      75% request already sent. Waiting for client payment.
                                    </p>
                                  )}
                                  {hasRejectedFinalReq && (
                                    <p className="text-[10px] text-red-600 font-semibold mt-1">
                                      Previous 75% request was rejected. You can send it again.
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black uppercase tracking-widest">
                                    25% Paid
                                  </Badge>
                                  <Badge variant="outline" className="border-slate-200 text-slate-600 text-[9px] font-bold uppercase">
                                    75% Payment Pending
                                  </Badge>
                                  {canRequestFinal ? (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        const token = getToken()
                                        if (!token) return router.push("/login")
                                        try {
                                          const res = await fetch(
                                            `${API_BASE}/api/events/${e.id}/create-final-request`,
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`,
                                              },
                                            }
                                          )
                                          const data = await res.json()
                                          if (res.ok) {
                                            toast.success("75% payment request sent")
                                            loadData()
                                          } else {
                                            toast.error(data.error || "Failed to create final payment request")
                                          }
                                        } catch (err) {
                                          console.error(err)
                                          toast.error("Error creating final payment request")
                                        }
                                      }}
                                      className="h-9 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest"
                                    >
                                      {hasRejectedFinalReq ? "Resend Remaining 75%" : "Request Remaining 75%"}
                                    </Button>
                                  ) : e.status !== "completed" ? (
                                    <Button
                                      size="sm"
                                      disabled={completingEventId === e.id}
                                      onClick={async () => {
                                        const token = getToken()
                                        if (!token) return router.push("/login")
                                        setCompletingEventId(e.id)
                                        try {
                                          const res = await fetch(
                                            `${API_BASE}/api/events/${e.id}/complete`,
                                            {
                                              method: "POST",
                                              headers: { Authorization: `Bearer ${token}` },
                                            }
                                          )
                                          const data = await res.json().catch(() => ({}))
                                          if (res.ok) {
                                            toast.success("Event marked as completed.")
                                            toast("Next step required", {
                                              description: "Go to Organizer Fees and request the remaining 75% payment from the client.",
                                              action: {
                                                label: "Open Organizer Fees",
                                                onClick: () => router.push("/dashboard/payments?tab=organizer", { scroll: false }),
                                              },
                                            })
                                            loadData()
                                            if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
                                          } else {
                                            toast.error(data.error || "Failed to mark event as completed")
                                          }
                                        } catch (err) {
                                          console.error(err)
                                          toast.error("Failed to mark event as completed")
                                        } finally {
                                          setCompletingEventId(null)
                                        }
                                      }}
                                      className="h-9 rounded-xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest"
                                    >
                                      {completingEventId === e.id ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                          Completing...
                                        </>
                                      ) : (
                                        "Mark Event Completed"
                                      )}
                                    </Button>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 font-semibold">
                                      75% final request already sent.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )})()
                            ))}
                          </div>
                        </Card>
                      )}

                      {pendingFinalSorted.length > 0 && (
                        <Card className="p-6 rounded-[32px] border-slate-100 bg-amber-50/60">
                          <PaymentWorkflowSectionHeader
                            title="75% final requested – awaiting client payment"
                            showViewAll={showPendingFinalViewAll}
                            href={orgAllHref}
                          />
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pendingFinalToShow.map((e: any) => {
                              const finalReq = findFinalRequestForEvent(e.id)
                              const requestedAt = finalReq?.created_at
                                ? new Date(finalReq.created_at).toLocaleString()
                                : null
                              return (
                                <div
                                  key={e.id}
                                  className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-amber-100"
                                >
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {e.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Waiting for user to pay remaining 75%.
                                    </p>
                                    {requestedAt && (
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Requested at {requestedAt}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-black uppercase tracking-widest">
                                      75% Requested
                                    </Badge>
                                    <Badge variant="outline" className="border-amber-200 text-amber-700 text-[9px] font-bold uppercase">
                                      Awaiting Client Payment
                                    </Badge>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </Card>
                      )}

                      {fullySorted.length > 0 && (
                        <Card className="p-6 rounded-[32px] border-slate-100 bg-indigo-50/70">
                          <PaymentWorkflowSectionHeader
                            title="Fully paid — completed"
                            showViewAll={showFullyViewAll}
                            href={orgAllHref}
                          />
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {fullyToShow.map((e: any) => (
                              <div
                                key={e.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-indigo-100"
                              >
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {e.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Both 25% advance and 75% final payments have been received.
                                  </p>
                                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                                    All payments completed successfully.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase tracking-widest">
                                    Advance Paid (25%)
                                  </Badge>
                                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase tracking-widest">
                                    75% Paid
                                  </Badge>
                                  <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
                                    Fully Paid
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {pendingForMeSorted.length > 0 && (
                    <Card className="p-6 rounded-[32px] border-slate-100">
                      <PaymentWorkflowSectionHeader
                        title="Organizer fee requests (pay now)"
                        showViewAll={showPendingForMeViewAll}
                        href={orgAllHref}
                      />
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingForMeToShow.map((r) => (
                          <div key={r.id} className="flex flex-col justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 h-full min-h-[140px]">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{r.event_name}</p>
                              <p className="font-bold text-slate-900">{r.organizer_name}</p>
                              <p className="text-sm text-slate-500">{r.description}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
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
                      <PaymentWorkflowSectionHeader
                        title="Your requests"
                        showViewAll={showMyReqViewAll}
                        href={orgAllHref}
                      />
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {myReqSorted.length === 0 ? (
                          <p className="text-sm text-slate-500 col-span-full">No requests yet.</p>
                        ) : (
                          myReqToShow.map((r) => (
                            <div key={r.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                              <span className="font-medium text-slate-800 line-clamp-1">{r.event_name} — {formatCurrency(r.amount)}</span>
                              <Badge className={r.status === "paid" ? "bg-emerald-100 text-emerald-700 font-semibold shrink-0" : r.status === "rejected" ? "bg-red-100 text-red-700 shrink-0" : "bg-amber-100 text-amber-700 shrink-0"}>
                                {r.status === "paid" ? "Paid" : r.status === "rejected" ? "Rejected" : "Pending"}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  )}
                  {pendingForMeSorted.length === 0 && myEventsAsOrganizer.length === 0 && (
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

        <TransactionHistoryDialog
          open={transactionHistoryOpen}
          onOpenChange={setTransactionHistoryOpen}
          payments={payments}
          formatCurrency={formatCurrency}
          defaultSection={
            activeTab === "requests" ? "vendor" : activeTab === "organizer" ? "organizer" : "funding"
          }
        />

        <StripeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
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

        <ReviewDialog
          open={vendorRatingPrompt !== null}
          onOpenChange={(open) => {
            if (!open) setVendorRatingPrompt(null)
          }}
          variant="professional"
          title={
            vendorRatingPrompt ? `Rate ${vendorRatingPrompt.vendorName}` : "Rate vendor"
          }
          description={
            vendorRatingPrompt
              ? `Vendor payout for “${vendorRatingPrompt.eventName}” is complete. Your rating appears on Vendors so you can compare partners for future events.`
              : undefined
          }
          onSubmit={async (rating, comment) => {
            if (!vendorRatingPrompt) return
            const t = getToken()
            if (!t) {
              toast.error("Please sign in again")
              return
            }
            const res = await fetch(`${API_BASE}/api/events/${vendorRatingPrompt.eventId}/reviews`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${t}`,
              },
              body: JSON.stringify({
                review_type: "organizer_to_vendor",
                subject_id: vendorRatingPrompt.vendorId,
                rating,
                comment: comment || undefined,
              }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              toast.error(data.error || "Could not submit review")
              throw new Error(data.error || "submit failed")
            }
            toast.success("Thanks — your feedback was saved.")
            setVendorRatingPrompt(null)
            loadData()
          }}
        />
      </div>
    </DashboardLayout>
  )
}