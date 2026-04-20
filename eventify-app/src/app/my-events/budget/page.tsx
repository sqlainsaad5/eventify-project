"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  Plus,
  AlertCircle,
  Wallet,
  Loader2,
  History,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  LayoutList,
  PieChart,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NotificationBell } from "@/components/notification-bell"
import { ReviewDialog } from "@/components/review-dialog"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function formatRs(n: number) {
  return `Rs. ${n.toLocaleString()}`
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  try {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

type BudgetPlanRow = {
  id?: number
  label: string
  allocated_amount: number
  notes?: string
}

type BudgetPlanSummary = {
  items: BudgetPlanRow[]
  total_allocated: number
  unallocated: number
}

const PLAN_TEMPLATES: Record<string, { label: string; pct: number }[]> = {
  wedding: [
    { label: "Venue & rentals", pct: 0.3 },
    { label: "Catering & cake", pct: 0.24 },
    { label: "Photo & video", pct: 0.12 },
    { label: "Attire & beauty", pct: 0.1 },
    { label: "Decor & flowers", pct: 0.1 },
    { label: "Music & entertainment", pct: 0.08 },
    { label: "Contingency", pct: 0.06 },
  ],
  corporate: [
    { label: "Venue & AV", pct: 0.35 },
    { label: "Catering", pct: 0.2 },
    { label: "Speakers & content", pct: 0.15 },
    { label: "Branding & signage", pct: 0.12 },
    { label: "Logistics & staff", pct: 0.1 },
    { label: "Contingency", pct: 0.08 },
  ],
  party: [
    { label: "Venue", pct: 0.28 },
    { label: "Food & drinks", pct: 0.26 },
    { label: "Decor", pct: 0.18 },
    { label: "Entertainment", pct: 0.16 },
    { label: "Misc & contingency", pct: 0.12 },
  ],
}

function buildTemplateRows(templateKey: string, totalBudget: number): BudgetPlanRow[] {
  const rows = PLAN_TEMPLATES[templateKey]
  if (!rows || totalBudget <= 0) return []
  let allocated = 0
  return rows.map((r, i) => {
    const amt =
      i === rows.length - 1
        ? Math.max(0, Math.round(totalBudget - allocated))
        : Math.round(totalBudget * r.pct)
    allocated += amt
    return { label: r.label, allocated_amount: amt, notes: "" }
  })
}

export default function BudgetPage() {
  const [events, setEvents] = useState<{ id: number; name: string; date: string; total_spent?: number }[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [summary, setSummary] = useState<{
    event_id: number
    event_name: string
    event_owner_id?: number
    organizer_id?: number | null
    total_budget: number
    total_spent: number
    remaining_budget: number
    budget_plan?: BudgetPlanSummary
    vendor_agreements: Array<{
      id: number
      vendor_id: number
      vendor_name: string
      service_type: string
      agreed_price: number
      advance_amount: number
      final_amount: number
      advance_status: string
      final_status: string
    }>
    assigned_vendors_without_agreement: Array<{ id: number; name: string; category: string }>
  } | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [budgetInput, setBudgetInput] = useState("")
  const [savingBudget, setSavingBudget] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [vendorRatingPrompt, setVendorRatingPrompt] = useState<{
    eventId: number
    vendorId: number
    vendorName: string
    eventName: string
  } | null>(null)
  const [paymentModalData, setPaymentModalData] = useState<{
    vendor_id: number
    vendor_name: string
    payment_type: "advance" | "final"
    amount: number
    agreed_price: number
  } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [addAgreementOpen, setAddAgreementOpen] = useState(false)
  const [newAgreementVendor, setNewAgreementVendor] = useState<number | null>(null)
  const [newAgreementPrice, setNewAgreementPrice] = useState("")
  const [newAgreementService, setNewAgreementService] = useState("")
  const [savingAgreement, setSavingAgreement] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [editAgreement, setEditAgreement] = useState<{ id: number; vendor_name: string; agreed_price: number; service_type: string } | null>(null)
  const [agreementToDelete, setAgreementToDelete] = useState<{ id: number; vendor_name: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingAgreement, setDeletingAgreement] = useState(false)
  const [editPriceStr, setEditPriceStr] = useState("")
  const [editServiceStr, setEditServiceStr] = useState("")
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [planDraft, setPlanDraft] = useState<BudgetPlanRow[]>([])
  const [savingPlan, setSavingPlan] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedRole = localStorage.getItem("role")
        if (storedRole) setRole(storedRole)
        const raw = localStorage.getItem("user")
        if (raw) {
          const u = JSON.parse(raw) as { id?: number | string }
          if (u?.id != null && u.id !== "") setCurrentUserId(Number(u.id))
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchSummary()
      fetchPayments()
    } else {
      setSummary(null)
      setPayments([])
    }
  }, [selectedEventId])

  useEffect(() => {
    if (summary) {
      setBudgetInput(String(summary.total_budget))
    }
  }, [summary?.total_budget])

  useEffect(() => {
    if (editAgreement) {
      setEditPriceStr(String(editAgreement.agreed_price))
      setEditServiceStr(editAgreement.service_type)
    }
  }, [editAgreement])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const all = [...(data.created || []), ...(data.assigned || [])]
        const unique = Array.from(new Map(all.map((e: any) => [e.id, e])).values())
        setEvents(unique)
        if (unique.length > 0 && !selectedEventId) {
          setSelectedEventId(unique[0].id)
        }
      }
    } catch {
      toast.error("Failed to fetch events")
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    if (!selectedEventId) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const res = await fetch(`${API_BASE}/api/events/${selectedEventId}/budget-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
        setSummaryError(null)
      } else {
        setSummary(null)
        let msg = "Could not load budget summary. Try again."
        try {
          const data = await res.json()
          if (data.error) msg = data.error
        } catch {
          if (res.statusText) msg = res.statusText
        }
        setSummaryError(msg)
        toast.error(msg)
      }
    } catch {
      setSummary(null)
      setSummaryError("Failed to fetch budget summary. Try again.")
      toast.error("Failed to fetch budget summary. Try again.")
    } finally {
      setSummaryLoading(false)
    }
  }

  const fetchPayments = async () => {
    if (!selectedEventId) return
    try {
      const res = await fetch(`${API_BASE}/api/events/${selectedEventId}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      } else {
        setPayments([])
        toast.error("Could not load payment history.")
      }
    } catch {
      setPayments([])
      toast.error("Could not load payment history.")
    }
  }

  const handleSaveBudget = async () => {
    if (!selectedEventId) return
    const val = parseFloat(budgetInput)
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid budget amount")
      return
    }
    setSavingBudget(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${selectedEventId}/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ budget: val }),
      })
      if (res.ok) {
        toast.success("Budget updated")
        fetchSummary()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update budget")
      }
    } catch {
      toast.error("Failed to update budget")
    } finally {
      setSavingBudget(false)
    }
  }

  const handleAutoCalcBudget = () => {
    if (!summary) return
    const total = summary.vendor_agreements.reduce((s, a) => s + a.agreed_price, 0)
    setBudgetInput(String(total))
  }

  const openPlanEditor = () => {
    if (!summary) return
    const items = summary.budget_plan?.items?.length
      ? summary.budget_plan.items.map((i) => ({
          id: i.id,
          label: i.label,
          allocated_amount: i.allocated_amount,
          notes: i.notes || "",
        }))
      : [{ label: "", allocated_amount: 0, notes: "" }]
    setPlanDraft(items)
    setPlanDialogOpen(true)
  }

  const handleApplyTemplate = (key: string) => {
    if (!summary || summary.total_budget <= 0) {
      toast.error("Set a positive total budget first (use Set Budget below).")
      return
    }
    const rows = buildTemplateRows(key, summary.total_budget)
    if (!rows.length) return
    setPlanDraft(rows)
    toast.success("Template applied — edit rows, then save.")
  }

  const handleSavePlan = async () => {
    if (!selectedEventId) return
    const items = planDraft
      .filter((r) => r.label.trim())
      .map((r) => ({
        label: r.label.trim(),
        allocated_amount: Number.isFinite(r.allocated_amount) ? r.allocated_amount : 0,
        notes: (r.notes || "").trim() || undefined,
      }))
    setSavingPlan(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${selectedEventId}/budget-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success("Budget plan saved")
        setPlanDialogOpen(false)
        fetchSummary()
      } else {
        toast.error(data.error || "Could not save plan")
      }
    } catch {
      toast.error("Could not save plan")
    } finally {
      setSavingPlan(false)
    }
  }

  const openPaymentModal = (vendorId: number, vendorName: string, type: "advance" | "final", agreedPrice: number) => {
    const amount = type === "advance" ? agreedPrice * 0.25 : agreedPrice * 0.75
    setPaymentModalData({ vendor_id: vendorId, vendor_name: vendorName, payment_type: type, amount, agreed_price: agreedPrice })
    setPaymentMethod("bank_transfer")
    setPaymentNotes("")
    setPaymentModalOpen(true)
  }

  const handleSubmitPayment = async () => {
    if (!paymentModalData || !selectedEventId) return
    setSubmittingPayment(true)
    try {
      const res = await fetch(`${API_BASE}/api/payments/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          event_id: selectedEventId,
          vendor_id: paymentModalData.vendor_id,
          payment_type: paymentModalData.payment_type,
          amount: paymentModalData.amount,
          payment_method: paymentMethod,
          notes: paymentNotes,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Payment registered successfully")
        setPaymentModalOpen(false)
        setPaymentModalData(null)
        fetchSummary()
        fetchPayments()
        const p = data.prompt_vendor_review
        if (p?.event_id && p?.vendor_id) {
          setVendorRatingPrompt({
            eventId: p.event_id,
            vendorId: p.vendor_id,
            vendorName: p.vendor_name || "Vendor",
            eventName: p.event_name || "",
          })
        }
      } else {
        toast.error(data.error || "Failed to register payment")
      }
    } catch {
      toast.error("Failed to register payment")
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleAddAgreement = async () => {
    if (!selectedEventId || !newAgreementVendor || !newAgreementPrice) return
    const price = parseFloat(newAgreementPrice)
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid agreed price")
      return
    }
    setSavingAgreement(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${selectedEventId}/vendor-agreements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          agreements: [{ vendor_id: newAgreementVendor, agreed_price: price, service_type: newAgreementService || "General" }],
        }),
      })
      if (res.ok) {
        toast.success("Vendor agreement added")
        setAddAgreementOpen(false)
        setNewAgreementVendor(null)
        setNewAgreementPrice("")
        setNewAgreementService("")
        fetchSummary()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to add agreement")
      }
    } catch {
      toast.error("Failed to add agreement")
    } finally {
      setSavingAgreement(false)
    }
  }

  const handleEditAgreement = async () => {
    if (!selectedEventId || !editAgreement) return
    const price = parseFloat(editPriceStr)
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid agreed price")
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/events/${selectedEventId}/vendor-agreements/${editAgreement.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            agreed_price: price,
            service_type: editServiceStr || "General",
          }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Agreement updated")
        setEditAgreement(null)
        fetchSummary()
      } else {
        toast.error(data.error || "Failed to update agreement")
      }
    } catch {
      toast.error("Failed to update agreement")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteAgreement = async () => {
    if (!selectedEventId || !agreementToDelete) return
    setDeletingAgreement(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/events/${selectedEventId}/vendor-agreements/${agreementToDelete.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Vendor agreement removed")
        setAgreementToDelete(null)
        fetchSummary()
      } else {
        toast.error(data.error || "Failed to remove agreement")
      }
    } catch {
      toast.error("Failed to remove agreement")
    } finally {
      setDeletingAgreement(false)
    }
  }

  const exportReport = () => {
    if (!summary || payments.length === 0) {
      toast.error("No payment history to export")
      return
    }
    const headers = ["Date", "Vendor", "Type", "Amount"]
    const rows = payments.map((p) => [
      formatDate(p.payment_date || p.created_at),
      p.vendor_name || "N/A",
      p.payment_type || "Other",
      p.amount,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `budget-report-${summary.event_name}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Report exported")
  }

  const printSummary = () => {
    window.print()
  }

  const usagePercent = summary && summary.total_budget > 0
    ? (summary.total_spent / summary.total_budget) * 100
    : 0
  const isOverBudget = summary
    ? summary.remaining_budget < -0.5 && usagePercent > 100
    : false
  const pendingAdvanceCount = summary?.vendor_agreements.filter((a) => a.advance_status === "pending").length ?? 0

  const isOrganizer = role === "organizer"
  const isEventOwner =
    summary != null &&
    currentUserId != null &&
    Number(summary.event_owner_id) === Number(currentUserId)
  /** API allows both owner and assigned organizer to PATCH /budget and PUT /budget-plan */
  const canEditEventBudget = isOrganizer || isEventOwner

  const myEventsShell = (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-12">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Eventify<span className="text-indigo-600">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <Link
              href="/my-events"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="h-4 w-4" /> My Events
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div
        className="py-12 text-center text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)",
        }}
      >
        <div className="relative z-10 container mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">Budget Planner</h1>
          <p className="text-white/80 font-medium max-w-2xl mx-auto">
            Set your total budget, build a category-by-category plan, then track spending against it.
          </p>
        </div>
      </div>
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        {myEventsShell}
        <div className="container mx-auto px-6 py-12">
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-slate-500 font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {myEventsShell}
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div />
          <div className="flex gap-2">
            <Link href="/my-events">
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                My Events
              </Button>
            </Link>
          </div>
        </div>

        {/* Event Selector */}
        <Card className="border-slate-200/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Select Event</CardTitle>
            <CardDescription>Choose an event to view and manage its budget</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEventId ? String(selectedEventId) : ""}
              onValueChange={(v) => setSelectedEventId(v ? parseInt(v, 10) : null)}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} — {e.date}
                    {typeof e.total_spent === "number" ? ` — ${formatRs(e.total_spent)} spent` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!selectedEventId && events.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900">No events</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">Create an event to start tracking your budget.</p>
            <Link href="/my-events">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8">
                My Events
              </Button>
            </Link>
          </div>
        )}

        {selectedEventId && (
          <>
            {summaryLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              </div>
            ) : summary ? (
              <>
                {/* 1) Total budget — owners & organizers (API allows both) */}
                {canEditEventBudget && (
                  <Card className="border-slate-200/60 rounded-2xl border-indigo-200/80 shadow-md shadow-indigo-100/40">
                    <CardHeader>
                      <CardTitle>Step 1 — Total event budget</CardTitle>
                      <CardDescription>
                        Set how much you plan to spend in total. You need this before templates split amounts across
                        categories.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <Label>Total Budget (Rs.)</Label>
                          <Input
                            type="number"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            placeholder="200000"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAutoCalcBudget}
                          className="shrink-0"
                        >
                          Auto from vendor costs
                        </Button>
                        <Button onClick={handleSaveBudget} disabled={savingBudget} className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
                          {savingBudget ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save total budget
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 2) Planned allocation (real budget plan, persisted) */}
                <Card className="border-slate-200/60 rounded-2xl border-indigo-100/80 bg-gradient-to-br from-white to-indigo-50/40 ring-1 ring-indigo-100/60">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <PieChart className="h-5 w-5 text-indigo-600 shrink-0" />
                          Step 2 — Budget allocation plan
                        </CardTitle>
                        <CardDescription>
                          Build and save a real plan: categories (venue, catering, etc.) with planned amounts. This is stored
                          for the event — spending below still reflects actual vendor payments.
                        </CardDescription>
                      </div>
                      <Button type="button" onClick={openPlanEditor} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0">
                        <LayoutList className="h-4 w-4 mr-2" />
                        {summary.budget_plan?.items?.length ? "Edit plan" : "Create plan"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!summary.budget_plan?.items?.length ? (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          No saved plan yet. Click{" "}
                          <span className="font-bold text-indigo-700">Create plan</span> to open the editor, add rows, or apply a
                          template (wedding / corporate / party). Plans are saved to your event when you click{" "}
                          <span className="font-bold">Save plan</span>.
                        </p>
                        {summary.total_budget <= 0 && canEditEventBudget && (
                          <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            Set a positive total budget in Step 1 first — templates divide that amount across categories.
                          </p>
                        )}
                        <Button type="button" onClick={openPlanEditor} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                          <LayoutList className="h-4 w-4 mr-2" />
                          Open budget plan editor
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div>
                            <span className="text-slate-500">Planned in categories </span>
                            <span className="font-black text-indigo-700 tabular-nums">
                              {formatRs(summary.budget_plan.total_allocated)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Unassigned to categories </span>
                            <span
                              className={`font-black tabular-nums ${
                                summary.budget_plan.unallocated < -0.5 ? "text-red-600" : "text-slate-900"
                              }`}
                            >
                              {formatRs(summary.budget_plan.unallocated)}
                            </span>
                            {summary.budget_plan.unallocated < -0.5 && (
                              <span className="text-xs text-amber-700 ml-2">(plan exceeds total budget)</span>
                            )}
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Planned</TableHead>
                              <TableHead className="hidden md:table-cell">Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.budget_plan.items.map((row, idx) => (
                              <TableRow key={row.id ?? `plan-${idx}-${row.label}`}>
                                <TableCell className="font-medium">{row.label}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatRs(row.allocated_amount)}</TableCell>
                                <TableCell className="hidden md:table-cell text-slate-500 text-sm max-w-[240px] truncate">
                                  {row.notes || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Spending status (actuals vs total) */}
                <div className="space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Expense status</h2>
                  {isOverBudget && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have exceeded your budget by {formatRs(Math.abs(summary.remaining_budget))}!
                      </AlertDescription>
                    </Alert>
                  )}
                  {!isOverBudget && summary.remaining_budget >= 0 && (
                    <Alert className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription>
                        Budget status: {Math.round(100 - usagePercent)}% remaining — You&apos;re on track!
                      </AlertDescription>
                    </Alert>
                  )}
                  {pendingAdvanceCount > 0 && (
                    <Alert className="rounded-xl border-amber-200 bg-amber-50">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertDescription>
                        Reminder: Advance payment pending for {pendingAdvanceCount} vendor{pendingAdvanceCount > 1 ? "s" : ""}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-white border-slate-200/60 rounded-2xl">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500 mb-1">Total Budget</p>
                      <h3 className="text-2xl font-black text-slate-900">{formatRs(summary.total_budget)}</h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200/60 rounded-2xl">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500 mb-1">Total Spent</p>
                      <h3 className="text-2xl font-black text-indigo-600">{formatRs(summary.total_spent)}</h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200/60 rounded-2xl">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500 mb-1">Remaining Budget</p>
                      <h3 className={`text-2xl font-black ${summary.remaining_budget < 0 ? "text-red-600" : "text-slate-900"}`}>
                        {formatRs(summary.remaining_budget)}
                      </h3>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Usage</span>
                    <span>{Math.round(usagePercent)}%</span>
                  </div>
                  <Progress
                    value={Math.min(usagePercent, 100)}
                    className="h-2 bg-slate-100"
                    indicatorClassName={usagePercent > 100 ? "bg-red-500" : usagePercent > 75 ? "bg-amber-500" : "bg-emerald-500"}
                  />
                </div>

                {/* Vendor Payment Table (organizer only) */}
                {isOrganizer && (
                  <Card className="border-slate-200/60 rounded-2xl">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <CardTitle>Vendor Payments</CardTitle>
                          <CardDescription>Track advance (25%) and final (75%) payments per vendor</CardDescription>
                        </div>
                        {summary.assigned_vendors_without_agreement.length > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setAddAgreementOpen(true)}>
                            Add Vendor Agreement
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {summary.vendor_agreements.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                          <p>No vendor agreements yet.</p>
                          <p className="text-sm mt-1">Assign vendors to your event and add agreed prices here.</p>
                          {summary.assigned_vendors_without_agreement.length > 0 && (
                            <Button className="mt-4" variant="outline" onClick={() => setAddAgreementOpen(true)}>
                              Add Vendor Agreement
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Service Type</TableHead>
                              <TableHead>Agreed Price</TableHead>
                              <TableHead>Advance (25%)</TableHead>
                              <TableHead>Final (75%)</TableHead>
                              <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.vendor_agreements.map((a) => (
                              <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.vendor_name}</TableCell>
                                <TableCell>{a.service_type}</TableCell>
                                <TableCell>{formatRs(a.agreed_price)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{formatRs(a.advance_amount)}</span>
                                    {a.advance_status === "paid" ? (
                                      <Badge variant="default" className="bg-emerald-600 text-xs">PAID</Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => openPaymentModal(a.vendor_id, a.vendor_name, "advance", a.agreed_price)}
                                      >
                                        Pay Advance
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{formatRs(a.final_amount)}</span>
                                    {a.final_status === "paid" ? (
                                      <Badge variant="default" className="bg-emerald-600 text-xs">PAID</Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        disabled={a.advance_status !== "paid"}
                                        onClick={() => openPaymentModal(a.vendor_id, a.vendor_name, "final", a.agreed_price)}
                                      >
                                        Pay Final
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs h-7"
                                      onClick={() => setEditAgreement({ id: a.id, vendor_name: a.vendor_name, agreed_price: a.agreed_price, service_type: a.service_type })}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setAgreementToDelete({ id: a.id, vendor_name: a.vendor_name })}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={2} className="font-bold">Total</TableCell>
                              <TableCell className="font-bold">
                                {formatRs(summary.vendor_agreements.reduce((s, a) => s + a.agreed_price, 0))}
                              </TableCell>
                              <TableCell>
                                {formatRs(summary.vendor_agreements.reduce((s, a) => s + a.advance_amount, 0))}
                              </TableCell>
                              <TableCell>
                                {formatRs(summary.vendor_agreements.reduce((s, a) => s + a.final_amount, 0))}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          </TableFooter>
                        </Table>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => historyRef.current?.scrollIntoView({ behavior: "smooth" })}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment History */}
                <Card className="border-slate-200/60 rounded-2xl" ref={historyRef}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle>Payment History</CardTitle>
                        <CardDescription>All payments for this event</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={printSummary}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print Summary
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <p className="py-8 text-center text-slate-500">No payments recorded yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{formatDate(p.payment_date || p.created_at)}</TableCell>
                              <TableCell>{p.vendor_name || "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {p.payment_type || "Other"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{formatRs(p.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : summaryError ? (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                  <span>{summaryError}</span>
                  <Button variant="outline" size="sm" onClick={() => fetchSummary()}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        {/* Payment Modal (organizer only) */}
        {isOrganizer && (
          <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Process Payment</DialogTitle>
              </DialogHeader>
              {paymentModalData && (
                <div className="space-y-4">
                  <div>
                    <Label>Vendor</Label>
                    <p className="font-medium">{paymentModalData.vendor_name}</p>
                  </div>
                  <div>
                    <Label>Event</Label>
                    <p className="font-medium">{summary?.event_name}</p>
                  </div>
                  <div>
                    <Label>Amount Due</Label>
                    <p className="font-medium">{formatRs(paymentModalData.amount)} ({paymentModalData.payment_type === "advance" ? "25%" : "75%"})</p>
                  </div>
                  <div>
                    <Label>Payment Type</Label>
                    <p className="font-medium capitalize">{paymentModalData.payment_type} Payment</p>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitPayment} disabled={submittingPayment}>
                  {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Pay Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Vendor Agreement Modal (organizer only) */}
        {isOrganizer && (
          <Dialog open={addAgreementOpen} onOpenChange={setAddAgreementOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Vendor Agreement</DialogTitle>
                <DialogFooter className="sr-only" />
              </DialogHeader>
              {summary && summary.assigned_vendors_without_agreement.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Vendor</Label>
                    <Select value={newAgreementVendor ? String(newAgreementVendor) : ""} onValueChange={(v) => setNewAgreementVendor(v ? parseInt(v, 10) : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {summary.assigned_vendors_without_agreement.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name} ({v.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Agreed Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={newAgreementPrice}
                      onChange={(e) => setNewAgreementPrice(e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label>Service Type</Label>
                    <Input
                      value={newAgreementService}
                      onChange={(e) => setNewAgreementService(e.target.value)}
                      placeholder="Catering, Decoration, etc."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddAgreementOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddAgreement} disabled={savingAgreement}>
                      {savingAgreement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Agreement
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Budget plan</DialogTitle>
              <DialogDescription>
                Divide your total budget into categories. Total event budget:{" "}
                <span className="font-semibold text-foreground">{summary ? formatRs(summary.total_budget) : "—"}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Templates (fill from total budget)</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => handleApplyTemplate("wedding")}>
                  Wedding
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => handleApplyTemplate("corporate")}>
                  Corporate
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => handleApplyTemplate("party")}>
                  Party
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-slate-500"
                  onClick={() => setPlanDraft([{ label: "", allocated_amount: 0, notes: "" }])}
                >
                  Clear to blank row
                </Button>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {planDraft.map((row, idx) => (
                <div
                  key={`draft-${idx}`}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-2 items-end border border-slate-100 rounded-2xl p-3 bg-slate-50/80"
                >
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={row.label}
                      placeholder="e.g. Venue"
                      onChange={(e) => {
                        const v = e.target.value
                        setPlanDraft((d) => d.map((x, i) => (i === idx ? { ...x, label: v } : x)))
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Planned (Rs.)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.allocated_amount === 0 ? "" : row.allocated_amount}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value
                        const n = raw === "" ? 0 : parseFloat(raw)
                        setPlanDraft((d) =>
                          d.map((x, i) => (i === idx ? { ...x, allocated_amount: Number.isFinite(n) ? n : 0 } : x))
                        )
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={row.notes || ""}
                      placeholder="Optional"
                      onChange={(e) => {
                        const v = e.target.value
                        setPlanDraft((d) => d.map((x, i) => (i === idx ? { ...x, notes: v } : x)))
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => setPlanDraft((d) => d.filter((_, i) => i !== idx))}
                      disabled={planDraft.length === 0}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed"
              onClick={() => setPlanDraft((d) => [...d, { label: "", allocated_amount: 0, notes: "" }])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add category
            </Button>
            <p className="text-sm text-slate-600">
              Draft total:{" "}
              <span className="font-black text-indigo-700 tabular-nums">
                {formatRs(planDraft.reduce((s, r) => s + (Number.isFinite(r.allocated_amount) ? r.allocated_amount : 0), 0))}
              </span>
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={handleSavePlan} disabled={savingPlan}>
                {savingPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ReviewDialog
          open={vendorRatingPrompt !== null}
          onOpenChange={(open) => {
            if (!open) setVendorRatingPrompt(null)
          }}
          variant="professional"
          title={
            vendorRatingPrompt
              ? `Rate ${vendorRatingPrompt.vendorName}`
              : "Rate vendor"
          }
          description={
            vendorRatingPrompt
              ? `Final payment for “${vendorRatingPrompt.eventName}” is recorded. Share a brief professional rating—this helps other organizers choose reliable partners.`
              : undefined
          }
          onSubmit={async (rating, comment) => {
            if (!vendorRatingPrompt) return
            const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            if (!t) {
              toast.error("Please sign in again")
              return
            }
            const res = await fetch(
              `${API_BASE}/api/events/${vendorRatingPrompt.eventId}/reviews`,
              {
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
              }
            )
            const errBody = await res.json().catch(() => ({}))
            if (!res.ok) {
              toast.error(errBody.error || "Could not save your review")
              throw new Error(errBody.error || "review failed")
            }
            toast.success("Thank you — your rating was saved.")
            setVendorRatingPrompt(null)
            fetchSummary()
            fetchPayments()
          }}
        />
      </main>
    </div>
  )
}
