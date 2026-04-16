"use client"

import { useState, useEffect } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  DollarSign,
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
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

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
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [userName, setUserName] = useState("Vendor")
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [token, setToken] = useState("")
  const [organizerRatings, setOrganizerRatings] = useState<OrganizerRatingSummary | null>(null)
  const [organizerReviewRows, setOrganizerReviewRows] = useState<OrganizerReviewRow[]>([])

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

  const fetchDashboardData = async () => {
    setLoading(true)
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
        setAssignedEvents(d.assigned_events || [])
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
      setLoading(false)
    }
  }

  const activeEvents = assignedEvents.filter((e) => e.status !== "completed")
  const completedEvents = assignedEvents.filter((e) => e.status === "completed")
  const activeServices = services.filter((s) => s.isActive !== false)

  const upcomingEvents = [...assignedEvents]
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4)

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
          <Link href="/vendor/bookings">
            <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-100 rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              View Bookings
            </Button>
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
                  {organizerReviewRows.map((rev) => (
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
              <Link href="/vendor/bookings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 font-bold uppercase tracking-wider text-[11px]"
                >
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="group hover:border-purple-200 hover:shadow-md transition-all duration-200 overflow-hidden border-slate-200/60 rounded-2xl"
                  >
                    <div className="flex items-center p-5">
                      <div className="w-1.5 h-10 rounded-full bg-purple-600 mr-5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 truncate">{event.name}</h3>
                          <Badge
                            variant="secondary"
                            className={`border-none text-[10px] uppercase font-bold px-1.5 py-0 ${event.status === "completed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-purple-50 text-purple-600"
                              }`}
                          >
                            {event.status === "completed" ? "Completed" : "Active"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Rs. {event.budget?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Link href="/vendor/bookings">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 group-hover:text-purple-600 transition-colors"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No upcoming events assigned</p>
                  <p className="text-slate-400 text-sm mt-1">
                    You'll see events here once an organizer assigns you.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>

            <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-xl shadow-purple-200 ring-1 ring-white/20 rounded-[32px] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-indigo-100 mb-1">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Vendor Hub</span>
                </div>
                <CardTitle className="text-lg">Manage Your Business</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-indigo-50/90 leading-relaxed">
                  {assignedEvents.length > 0
                    ? `You have ${activeEvents.length} active event${activeEvents.length !== 1 ? "s" : ""}. Keep your services updated to attract more organizers.`
                    : "Add your services and keep your profile updated to get assigned to events by organizers."}
                </p>
                <Link href="/vendor/services">
                  <Button className="w-full bg-white/20 hover:bg-white/30 border-white/10 text-white backdrop-blur-md rounded-xl">
                    Manage Services
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Links</CardTitle>
                <CardDescription>Common vendor tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link href="/vendor/bookings">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl"
                    size="sm"
                  >
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    View Assigned Events
                  </Button>
                </Link>
                <Link href="/vendor/messages">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                    Messages
                  </Button>
                </Link>
                <Link href="/vendor/analytics">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl"
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2 text-emerald-500" />
                    View Analytics
                  </Button>
                </Link>
                <Link href="/vendor/profile">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl"
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2 text-amber-500" />
                    Update Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
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
