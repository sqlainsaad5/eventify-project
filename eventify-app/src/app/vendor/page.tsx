"use client"

import { useState, useEffect, useMemo } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  CheckCircle,
  ArrowRight,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  TrendingUp,
  MessageSquare,
  BarChart3,
  User,
  Star,
  Shield,
  Handshake,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  seedVendorBookingBaseline,
  isVendorBookingUnseen,
  markVendorBookingSeen,
  getPreviewVisible,
  VENDOR_EVENT_PREVIEW_COUNT,
} from "@/lib/vendor-booking-notifications"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type OrganizerRatingSummary = {
  vendor: { avg: number | null; count: number }
}

type OrganizerReviewRow = {
  id: number
  rating: number
  comment: string | null
  created_at: string | null
  author_name?: string | null
  event_id?: number
}

export default function VendorDashboard() {
  const [assignedEvents, setAssignedEvents] = useState<any[]>([])
  const [partnershipRequests, setPartnershipRequests] = useState<any[]>([])
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [userName, setUserName] = useState("Vendor")
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [token, setToken] = useState("")
  const [organizerRatings, setOrganizerRatings] = useState<OrganizerRatingSummary | null>(null)
  const [organizerReviewRows, setOrganizerReviewRows] = useState<OrganizerReviewRow[]>([])
  const [partnershipActionId, setPartnershipActionId] = useState<number | null>(null)
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [badgeTick, setBadgeTick] = useState(0)

  useEffect(() => {
    const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim() || ""
    const u = JSON.parse(localStorage.getItem("user") || "{}")
    setToken(t)
    setVendorId(u?.id || null)
    if (u?.name) setUserName(u.name)
  }, [])

  useEffect(() => {
    if (token && vendorId) fetchDashboardData()
  }, [token, vendorId])

  const fetchDashboardData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      // Fetch user profile for latest name
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (userRes.ok) {
        const data = await userRes.json()
        setUserName(data.name || "Vendor")
        localStorage.setItem("user", JSON.stringify(data))
      }

      // Fetch assigned events
      const eventsRes = await fetch(
        `${API_BASE}/api/vendors/assigned_events/${vendorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (eventsRes.ok) {
        const d = await eventsRes.json()
        const accepted = d.assigned_events || []
        const partners = Array.isArray(d.partnership_requests) ? d.partnership_requests : []
        setPartnershipRequests(partners)
        setAssignedEvents(accepted)
        seedVendorBookingBaseline(vendorId, [
          ...partners.map((p: { id: number }) => p.id),
          ...accepted.map((e: { id: number }) => e.id),
        ])
      }

      // Fetch services (uses vendor_id query param, no JWT)
      const servicesRes = await fetch(
        `${API_BASE}/api/vendor/services?vendor_id=${vendorId}`
      )
      if (servicesRes.ok) {
        const d = await servicesRes.json()
        setServices(Array.isArray(d) ? d : [])
      }

      // Fetch payment requests (vendor's own requests via /api/payments/request endpoint)
      // The backend /api/payments/requests returns organizer's requests, so we use vendor bookings endpoint
      const paymentsRes = await fetch(
        `${API_BASE}/api/vendors/${vendorId}/bookings`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (paymentsRes.ok) {
        const d = await paymentsRes.json()
        setPaymentRequests(Array.isArray(d) ? d : [])
      }

      const [sumRes, revRes] = await Promise.all([
        fetch(`${API_BASE}/api/users/${vendorId}/rating-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${API_BASE}/api/users/${vendorId}/reviews?review_type=organizer_to_vendor&per_page=6&page=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ])
      if (sumRes.ok) {
        const s = await sumRes.json()
        setOrganizerRatings({ vendor: s.vendor })
      } else {
        setOrganizerRatings(null)
      }
      if (revRes.ok) {
        const r = await revRes.json()
        setOrganizerReviewRows(Array.isArray(r.reviews) ? r.reviews : [])
      } else {
        setOrganizerReviewRows([])
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error)
      toast.error("Failed to sync dashboard data")
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  const respondToPartnership = async (eventId: number, action: "accept" | "decline") => {
    if (!token) return
    setPartnershipActionId(eventId)
    try {
      const res = await fetch(
        `${API_BASE}/api/vendors/partnership/${action === "accept" ? "accept" : "decline"}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event_id: eventId }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(action === "accept" ? "Partnership confirmed" : "Request declined")
        await fetchDashboardData({ silent: true })
      } else {
        toast.error((data as { error?: string }).error || "Something went wrong")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setPartnershipActionId(null)
    }
  }

  const reviewRowsNewestFirst = [...organizerReviewRows].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })

  const activeEvents = assignedEvents.filter((e) => e.status !== "completed")
  const completedEvents = assignedEvents.filter((e) => e.status === "completed")
  const activeServices = services.filter((s) => s.isActive !== false)

  const allUpcomingEvents = [...assignedEvents]
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => {
      const am = a.partnership_confirmed_at || a.assigned_at
      const bm = b.partnership_confirmed_at || b.assigned_at
      if (am && bm) return new Date(bm).getTime() - new Date(am).getTime()
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  const upcomingEvents = getPreviewVisible(allUpcomingEvents, upcomingExpanded)
  const upcomingRest = Math.max(0, allUpcomingEvents.length - VENDOR_EVENT_PREVIEW_COUNT)

  const markSeen = (eventId: number) => {
    if (!vendorId) return
    markVendorBookingSeen(vendorId, eventId)
    setBadgeTick((n) => n + 1)
  }

  const newBookingCount = useMemo(() => {
    if (vendorId == null) return 0
    let n = 0
    for (const p of partnershipRequests) {
      if (isVendorBookingUnseen(vendorId, p.id)) n += 1
    }
    for (const e of assignedEvents) {
      if (isVendorBookingUnseen(vendorId, e.id)) n += 1
    }
    return n
  }, [vendorId, partnershipRequests, assignedEvents, badgeTick])

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Syncing your dashboard...</p>
          </div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="space-y-10">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-slate-500 mt-1">
              Here's a snapshot of your vendor activity and upcoming events.
            </p>
          </div>
          <Link href="/vendor/bookings" className="relative inline-flex">
            <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-100 rounded-xl pr-8">
              <Calendar className="h-4 w-4 mr-2" />
              View Bookings
            </Button>
            {newBookingCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                aria-label={`${newBookingCount} new booking${newBookingCount === 1 ? "" : "s"}`}
              >
                {newBookingCount > 9 ? "9+" : newBookingCount}
              </span>
            )}
          </Link>
        </div>

        {/* Vital Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Events"
            value={activeEvents.length.toString()}
            trend="Currently assigned"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            bgColor="bg-blue-50"
            href="/vendor/bookings"
          />
          <StatCard
            title="Completed"
            value={completedEvents.length.toString()}
            trend="Events finished"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            bgColor="bg-emerald-50"
            href="/vendor/bookings?tab=completed"
          />
          <StatCard
            title="My Services"
            value={activeServices.length.toString()}
            trend="Active listings"
            icon={<Briefcase className="h-5 w-5 text-purple-600" />}
            bgColor="bg-purple-50"
            href="/vendor/services"
          />
          <StatCard
            title="Total Events"
            value={assignedEvents.length.toString()}
            trend="All time"
            icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
            bgColor="bg-amber-50"
            href="/vendor/analytics"
          />
        </div>

        {partnershipRequests.length > 0 && (
          <Card className="border-amber-200/80 bg-amber-50/40 shadow-sm rounded-3xl overflow-hidden">
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-2 mb-4 text-amber-900">
                <Handshake className="h-5 w-5" />
                <h2 className="text-lg font-bold tracking-tight">Partnership requests</h2>
                <Badge className="ml-1 bg-amber-200/80 text-amber-950 text-[10px] font-bold border-none">
                  {partnershipRequests.length}
                </Badge>
              </div>
              <p className="text-sm text-amber-950/80 font-medium mb-4">
                Organizers are asking you to join these events. Approve to confirm; newest requests appear first.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {partnershipRequests.map((req) => (
                  <li
                    key={req.id}
                    className="relative flex flex-col justify-between gap-3 bg-white/90 rounded-2xl border border-amber-100/80 p-4 sm:min-h-[7.5rem]"
                  >
                    {vendorId && isVendorBookingUnseen(vendorId, req.id) && (
                      <span
                        className="absolute -right-0.5 -top-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow ring-2 ring-amber-50/50"
                        aria-label="New booking"
                      >
                        1
                      </span>
                    )}
                    <div
                      className="pr-1"
                      onClick={() => markSeen(req.id)}
                    >
                      <p className="font-bold text-slate-900">{req.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.organizer_name ? `With ${req.organizer_name} · ` : ""}
                        {new Date(req.date).toLocaleDateString()} · {req.venue}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="rounded-xl bg-slate-900 text-white"
                        disabled={partnershipActionId === req.id}
                        onClick={() => respondToPartnership(req.id, "accept")}
                      >
                        {partnershipActionId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Accept"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-amber-200/80"
                        disabled={partnershipActionId === req.id}
                        onClick={() => respondToPartnership(req.id, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Organizer professional ratings */}
        <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40 rounded-[28px] overflow-hidden bg-white">
          <div className="flex flex-col md:flex-row md:items-stretch gap-0">
            <div className="md:w-[280px] shrink-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 p-8 text-white flex flex-col justify-center">
              <div className="flex items-center gap-2 text-indigo-200 mb-3">
                <Shield className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Organizer feedback</span>
              </div>
              {organizerRatings && organizerRatings.vendor.count > 0 ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black tracking-tight leading-none">
                      {organizerRatings.vendor.avg?.toFixed(1) ?? "—"}
                    </span>
                    <div className="flex pb-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-5 w-5 ${
                            organizerRatings.vendor.avg != null && n <= Math.round(organizerRatings.vendor.avg)
                              ? "fill-amber-400 text-amber-400"
                              : "text-white/25"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-indigo-100/90 font-medium">
                    Based on <span className="font-black text-white">{organizerRatings.vendor.count}</span> organizer
                    {organizerRatings.vendor.count === 1 ? "" : "s"} after completed events.
                  </p>
                </>
              ) : (
                <p className="text-sm text-indigo-100/90 font-medium leading-relaxed">
                  When organizers close out vendor payments, they can leave a professional rating. Yours will appear
                  here to build trust with future partners.
                </p>
              )}
            </div>
            <CardContent className="flex-1 p-6 md:p-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Recent reviews</h3>
              {organizerReviewRows.length === 0 ? (
                <p className="text-slate-500 text-sm font-medium py-4">No organizer ratings yet.</p>
              ) : (
                <ul className="space-y-4">
                  {reviewRowsNewestFirst.map((rev) => (
                    <li
                      key={rev.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-4 w-4 ${n <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                          {rev.created_at
                            ? new Date(rev.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        From organizer{rev.author_name ? `: ${rev.author_name}` : ""}
                      </p>
                      {rev.comment ? (
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{rev.comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </div>
        </Card>

        <div className="space-y-10">
          {/* Upcoming Events — full width so cards can use the full row */}
          <section className="space-y-5" aria-labelledby="upcoming-events-heading">
            <div className="flex items-center justify-between">
              <h2 id="upcoming-events-heading" className="text-xl font-bold text-slate-900">
                Upcoming Events
              </h2>
              {allUpcomingEvents.length > 0 && (
                <Link
                  href="/vendor/bookings"
                  className="text-sm font-bold uppercase tracking-wider text-purple-600 hover:text-purple-700"
                >
                  Open bookings <ArrowRight className="h-3 w-3 inline ml-1" />
                </Link>
              )}
            </div>

            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {upcomingEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="group relative overflow-hidden border-slate-200/60 rounded-2xl transition-all duration-200 hover:border-purple-200 hover:shadow-md"
                      >
                        {vendorId && isVendorBookingUnseen(vendorId, event.id) && (
                          <span
                            className="absolute right-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow"
                            aria-label="New booking"
                          >
                            1
                          </span>
                        )}
                        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-500" />
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2 pr-6">
                            <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                              {event.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 border-none text-[9px] uppercase font-bold px-1.5 py-0 ${
                                event.status === "completed"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {event.status === "completed" ? "Done" : "Active"}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-500">
                            <p className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                            <p className="flex items-center gap-1.5 line-clamp-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {event.venue}
                            </p>
                            <p className="flex items-center gap-1.5">Rs {event.budget?.toLocaleString()}</p>
                          </div>
                          <Button
                            type="button"
                            asChild
                            className="w-full rounded-xl bg-slate-900/90 text-white mt-1"
                          >
                            <Link
                              href="/vendor/bookings"
                              onClick={() => markSeen(event.id)}
                            >
                              Open in bookings <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  {upcomingRest > 0 && !upcomingExpanded && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-slate-200"
                        onClick={() => setUpcomingExpanded(true)}
                      >
                        View all (+{upcomingRest} more)
                      </Button>
                    </div>
                  )}
                  {upcomingExpanded && allUpcomingEvents.length > VENDOR_EVENT_PREVIEW_COUNT && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-slate-600"
                        onClick={() => setUpcomingExpanded(false)}
                      >
                        Show first {VENDOR_EVENT_PREVIEW_COUNT} only
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No upcoming events assigned</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Confirm a partnership request above, or get assigned by an organizer.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Quick access: balanced row — no narrow sidebar beside empty space */}
          <section
            className="rounded-[28px] border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 shadow-sm"
            aria-labelledby="quick-access-heading"
          >
            <h2 id="quick-access-heading" className="sr-only">
              Quick access
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
              <Card className="flex min-h-0 flex-col border-none bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-200/30 ring-1 ring-white/15 rounded-[24px]">
                <CardHeader className="pb-2 pt-6 sm:pt-7">
                  <div className="mb-1 flex items-center gap-2 text-indigo-100">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Vendor hub</span>
                  </div>
                  <CardTitle className="text-lg leading-snug">Manage your business</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto space-y-4 px-6 pb-6 sm:px-7 sm:pb-7">
                  <p className="text-sm leading-relaxed text-indigo-50/90">
                    {assignedEvents.length > 0
                      ? `You have ${activeEvents.length} active event${activeEvents.length !== 1 ? "s" : ""}. Keep your services updated to attract more organizers.`
                      : "Add your services and keep your profile updated to get assigned to events by organizers."}
                  </p>
                  <Link href="/vendor/services" className="block">
                    <Button className="h-11 w-full rounded-xl border border-white/20 bg-white/20 text-white backdrop-blur-md hover:bg-white/30">
                      Manage services
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="flex min-h-0 flex-col rounded-[24px] border-slate-200/80 bg-white shadow-sm">
                <CardHeader className="space-y-1 border-b border-slate-100 pb-3 pt-6 sm:pt-7">
                  <CardTitle className="text-base">Quick links</CardTitle>
                  <CardDescription>Jump to the tools you use most</CardDescription>
                </CardHeader>
                <CardContent className="grid flex-1 grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 sm:p-5 sm:pt-4">
                  <Link href="/vendor/bookings" className="block min-h-0">
                    <span className="flex h-full min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <span className="leading-tight">Assigned events</span>
                    </span>
                  </Link>
                  <Link href="/vendor/messages" className="block min-h-0">
                    <span className="flex h-full min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-sky-200 hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <span className="leading-tight">Messages</span>
                    </span>
                  </Link>
                  <Link href="/vendor/analytics" className="block min-h-0">
                    <span className="flex h-full min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                      <span className="leading-tight">Analytics</span>
                    </span>
                  </Link>
                  <Link href="/vendor/profile" className="block min-h-0">
                    <span className="flex h-full min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-amber-200 hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="leading-tight">Profile</span>
                    </span>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </VendorLayout>
  )
}

function StatCard({
  title, value, trend, icon, bgColor, alert, href,
}: {
  title: string; value: string; trend: string; icon: React.ReactNode
  bgColor: string; alert?: boolean; href: string
}) {
  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 rounded-3xl cursor-pointer hover:scale-[1.02] active:scale-95 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-2xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            <Badge
              variant="secondary"
              className={`text-[10px] font-bold border-none px-2 ${alert ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}
            >
              {alert ? "ACTION" : "SYNCED"}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{value}</h3>
              <span className="text-[10px] font-bold text-slate-500">{trend}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
