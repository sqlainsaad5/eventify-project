"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  Plus,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Dashboard Version: 1.1.2 (Defensive Update)

export default function DashboardPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<any[]>([])
  const [userName, setUserName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}")
        return user.name || "Organizer"
      } catch {
        return "Organizer"
      }
    }
    return "Organizer"
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedRole = localStorage.getItem("role")
    if (savedRole === "user") {
      router.replace("/dashboard/profile")
      return
    }
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()

    try {
      // 1. Fetch User Profile
      const userRes = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        setUserName(userData.name)
        localStorage.setItem("user", JSON.stringify(userData))
      }

      // 2. Fetch Events, Payments, and Organizer Requests
      const [eventsRes, paymentsRes, organizerRequestsRes] = await Promise.all([
        fetch("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/payments/requests", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/payments/organizer-requests", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const eventsData = await eventsRes.json()
      const paymentsData = await paymentsRes.json()
      const organizerRequestsData = organizerRequestsRes.ok ? await organizerRequestsRes.json() : {}

      console.log("Dashboard Debug - Events Raw Data:", eventsData)

      if (eventsRes.ok) {
        let normalizedEvents = []
        if (Array.isArray(eventsData)) {
          normalizedEvents = eventsData
        } else if (eventsData && typeof eventsData === 'object') {
          normalizedEvents = [
            ...(eventsData.created || []),
            ...(eventsData.assigned || [])
          ]
        }

        // Final protection: ensure it's an array and remove duplicates
        const finalEvents = Array.isArray(normalizedEvents)
          ? Array.from(new Map(normalizedEvents.filter(e => e && e.id).map(e => [e.id, e])).values())
          : []

        setEvents(finalEvents)
      }

      if (paymentsRes.ok) {
        setPaymentRequests(paymentsData.requests || [])
      }

      if (organizerRequestsRes.ok) {
        setOrganizerRequests(organizerRequestsData.organizer_requests || [])
      }

    } catch (error) {
      console.error("Dashboard fetch error:", error)
      toast.error("Failed to sync dashboard data")
    } finally {
      setLoading(false)
    }
  }

  // Calculate Metrics with Type Checks
  const eventList = Array.isArray(events) ? events : []
  const paymentRequestList = Array.isArray(paymentRequests) ? paymentRequests : []

  const totalBudget = eventList.reduce((sum, e) => sum + (Number(e?.budget) || 0), 0)
  const pendingRequests = paymentRequestList.filter(r => r?.status === "pending").length
  const totalVendors = new Set(eventList.flatMap(e => e?.assigned_vendors || [])).size

  const sortedUpcoming = [...eventList]
    .filter(e => e?.date && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  const getUserId = (): number | null => {
    try {
      const u = localStorage.getItem("user")
      if (!u) return null
      const parsed = JSON.parse(u)
      return parsed?.id ?? parsed?._id ?? null
    } catch { return null }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Syncing your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, {userName}! 👋</h1>
            <p className="text-slate-500 mt-1">Here's what's happening with your events today.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/events/new">
              <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-100 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Events"
            value={eventList.length.toString()}
            trend="Active projects"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            bgColor="bg-blue-50"
            href="/dashboard/events"
          />
          <StatCard
            title="Staff/Vendors"
            value={totalVendors.toString()}
            trend="Across all events"
            icon={<Users className="h-5 w-5 text-purple-600" />}
            bgColor="bg-purple-50"
            href="/dashboard/vendors"
          />
          <StatCard
            title="Pending Actions"
            value={pendingRequests.toString()}
            trend="Require approval"
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            bgColor="bg-emerald-50"
            alert={pendingRequests > 0}
            href="/dashboard/payments"
          />
          <StatCard
            title="Total Budget"
            value={`$${(totalBudget / 1000).toFixed(1)}k`}
            trend="Organized capital"
            icon={<DollarSign className="h-5 w-5 text-amber-600" />}
            bgColor="bg-amber-50"
            href="/dashboard/budget"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Schedule</h2>
              <Link href="/dashboard/events">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 font-bold uppercase tracking-wider text-[11px]">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4">
              {sortedUpcoming.length > 0 ? (
                sortedUpcoming.map((event) => {
                  const userId = getUserId()
                  const organizerPaid = userId != null && event?.organizer_id === userId && organizerRequests.some((r: any) => r.event_id === event.id && r.status === "paid")
                  return (
                  <Card key={event.id} className={`group transition-all duration-200 overflow-hidden rounded-2xl ${organizerPaid ? "opacity-85 border-slate-200 border hover:shadow-sm" : "border-slate-200/60 border hover:border-purple-200 hover:shadow-md"}`}>
                    <div className="flex items-center p-5">
                      <div className={`w-1.5 h-10 rounded-full bg-purple-600 mr-5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 truncate">{event.name}</h3>
                          {organizerPaid && (
                            <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Paid</Badge>
                          )}
                          <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-none text-[10px] uppercase font-bold px-1.5 py-0">
                            {event.progress === 100 ? "Completed" : event.progress > 0 ? "In Progress" : "Planning"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {event.venue}
                          </p>
                        </div>
                      </div>
                      <Link href="/dashboard/events">
                        <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-purple-600 transition-colors">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )})
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No upcoming events found</p>
                  <Link href="/dashboard/events">
                    <Button variant="link" className="text-purple-600 mt-2">Create your first event</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Intelligent Insights</h2>
            <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-xl shadow-purple-200 ring-1 ring-white/20 rounded-[32px] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-indigo-100 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI Suggestion</span>
                </div>
                <CardTitle className="text-lg">Resource Optimization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-indigo-50/90 leading-relaxed italic">
                  {eventList.length > 0
                    ? `You have ${eventList.length} active projects. Using dynamic vendor assignments could reduce overhead by 12% across your schedule.`
                    : "Plan your first event to receive personalized AI recommendations on budgeting and venue selection."
                  }
                </p>
                <Link href="/dashboard/chatbot">
                  <Button className="w-full bg-white/20 hover:bg-white/30 border-white/10 text-white backdrop-blur-md rounded-xl">
                    Discuss with Assistant
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Common organizer tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link href="/dashboard/vendors">
                  <Button variant="outline" className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl" size="sm">
                    Search Vendors
                  </Button>
                </Link>
                <Link href="/dashboard/events">
                  <Button variant="outline" className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl" size="sm">
                    Plan New Project
                  </Button>
                </Link>
                <Link href="/dashboard/budget">
                  <Button variant="outline" className="w-full justify-start border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl" size="sm">
                    View Budget Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, trend, icon, bgColor, alert, href }: {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  bgColor: string;
  alert?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 rounded-3xl cursor-pointer hover:scale-[1.02] active:scale-95 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-2xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            <Badge variant="secondary" className={`text-[10px] font-bold border-none px-2 ${alert ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
              {alert ? "URGENT" : "SYNCED"}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{value}</h3>
              <span className="text-[10px] font-bold text-slate-500">
                {trend}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
