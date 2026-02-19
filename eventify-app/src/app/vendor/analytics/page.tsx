"use client"

import { useState, useEffect } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  TrendingUp,
  Calendar,
  CheckCircle,
  Loader2,
  RefreshCw,
  Briefcase,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"

const PIE_COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444"]

export default function VendorAnalyticsPage() {
  const [assignedEvents, setAssignedEvents] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [token, setToken] = useState("")

  useEffect(() => {
    const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim() || ""
    const u = JSON.parse(localStorage.getItem("user") || "{}")
    setToken(t)
    setVendorId(u?.id || null)
  }, [])

  useEffect(() => {
    if (token && vendorId) fetchData()
  }, [token, vendorId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [eventsRes, servicesRes] = await Promise.all([
        // GET /api/vendors/assigned_events/<vendor_id>
        fetch(`http://localhost:5000/api/vendors/assigned_events/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // GET /api/vendor/services?vendor_id=X (no JWT)
        fetch(`http://localhost:5000/api/vendor/services?vendor_id=${vendorId}`),
      ])

      if (eventsRes.ok) {
        const d = await eventsRes.json()
        setAssignedEvents(d.assigned_events || [])
      }
      if (servicesRes.ok) {
        const d = await servicesRes.json()
        setServices(Array.isArray(d) ? d : [])
      }
    } catch (err) {
      console.error("Analytics fetch error:", err)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  // Derived stats
  const totalEvents = assignedEvents.length
  const activeEvents = assignedEvents.filter((e) => e.status !== "completed").length
  const completedEvents = assignedEvents.filter((e) => e.status === "completed").length
  const activeServices = services.filter((s) => s.isActive !== false).length

  // Estimated earnings from completed events (80% of budget)
  const estimatedEarnings = assignedEvents
    .filter((e) => e.status === "completed")
    .reduce((sum, e) => sum + (e.budget || 0) * 0.8, 0)

  // Monthly events chart — group by month
  const monthlyData = (() => {
    const map: Record<string, { month: string; events: number; completed: number }> = {}
    assignedEvents.forEach((e) => {
      if (!e.date) return
      const d = new Date(e.date)
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
      if (!map[key]) map[key] = { month: key, events: 0, completed: 0 }
      map[key].events += 1
      if (e.status === "completed") map[key].completed += 1
    })
    return Object.values(map).slice(-6)
  })()

  // Pie chart — event status breakdown
  const pieData = [
    { name: "Active", value: activeEvents },
    { name: "Completed", value: completedEvents },
  ].filter((d) => d.value > 0)

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading analytics...</p>
          </div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">
              Track your event performance and service activity.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            className="rounded-xl border-slate-200 text-slate-600 self-start md:self-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Events"
            value={totalEvents.toString()}
            sub="All assigned"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
          />
          <SummaryCard
            title="Active Events"
            value={activeEvents.toString()}
            sub="In progress"
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            bg="bg-purple-50"
          />
          <SummaryCard
            title="Completed"
            value={completedEvents.toString()}
            sub="Finished events"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            bg="bg-emerald-50"
          />
          <SummaryCard
            title="Est. Earnings"
            value={`$${estimatedEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="From completed events"
            icon={<DollarSign className="h-5 w-5 text-amber-600" />}
            bg="bg-amber-50"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly Events Bar Chart */}
          <Card className="lg:col-span-2 border-slate-200/60 shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">
                Monthly Event Activity
              </CardTitle>
              <CardDescription>Events assigned and completed per month</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="events" name="Assigned" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
                  <Calendar className="h-12 w-12 text-slate-200 mb-3" />
                  <p className="font-medium text-slate-500">No event data yet</p>
                  <p className="text-sm mt-1">Charts will appear once you're assigned to events.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Status Pie */}
          <Card className="border-slate-200/60 shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Event Status</CardTitle>
              <CardDescription>Breakdown of your events</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
                  <TrendingUp className="h-12 w-12 text-slate-200 mb-3" />
                  <p className="font-medium text-slate-500">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Services Summary */}
        <Card className="border-slate-200/60 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Services Overview</CardTitle>
            <CardDescription>Your active and inactive service listings</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border ${service.isActive
                        ? "bg-purple-50/50 border-purple-100"
                        : "bg-slate-50 border-slate-100"
                      }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${service.isActive ? "bg-purple-100" : "bg-slate-200"
                        }`}
                    >
                      <Briefcase
                        className={`h-4 w-4 ${service.isActive ? "text-purple-600" : "text-slate-400"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{service.name}</p>
                      <p className="text-xs text-slate-500">{service.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-purple-600">
                        ${service.basePrice?.toLocaleString()}
                      </p>
                      <Badge
                        className={`border-none text-[10px] font-bold ${service.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                          }`}
                      >
                        {service.isActive ? "Active" : "Off"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Briefcase className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="font-medium text-slate-500">No services added yet</p>
                <p className="text-sm mt-1">Add services to see them here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  )
}

function SummaryCard({
  title, value, sub, icon, bg,
}: {
  title: string; value: string; sub: string; icon: React.ReactNode; bg: string
}) {
  return (
    <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 rounded-3xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-2xl ${bg}`}>{icon}</div>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
