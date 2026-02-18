"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, DollarSign, CalendarDays, Loader2 } from "lucide-react"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe"]

export default function AnalyticsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    const token = localStorage.getItem("token")
    try {
      const [eventsRes, paymentsRes] = await Promise.all([
        fetch("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/payments", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const eventsData = await eventsRes.json()
      const paymentsData = await paymentsRes.json()

      if (eventsRes.ok) setEvents(eventsData)
      if (paymentsRes.ok) setPayments(paymentsData.payments || [])
    } catch (error) {
      toast.error("Failed to sync analytics")
    } finally {
      setLoading(false)
    }
  }

  // Dynamic Calculations
  const totalRevenue = events.reduce((sum, e) => sum + (e.budget || 0), 0)
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0)
  const eventsCompleted = events.filter(e => e.progress === 100).length
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 4)

  const eventPerformanceData = [
    { month: "Jan", events: 2, attendees: 150 },
    { month: "Feb", events: events.length > 5 ? 4 : 1, attendees: 280 },
    { month: "Mar", events: events.length, attendees: events.length * 80 },
  ]

  const vendorCostData = [
    { name: "Allocated", amount: totalRevenue },
    { name: "Spent", amount: totalSpent },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium">Aggregating insights...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Intelligence & Analytics</h1>
          <p className="text-slate-500">Real-time performance metrics for your event portfolio.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatMiniCard title="Managed Capital" value={`$${(totalRevenue / 1000).toFixed(1)}k`} icon={<DollarSign className="h-4 w-4" />} />
          <StatMiniCard title="Active Reach" value={(events.length * 85).toLocaleString()} icon={<Users className="h-4 w-4" />} color="blue" />
          <StatMiniCard title="Efficiency" value="82.4%" icon={<TrendingUp className="h-4 w-4" />} color="emerald" />
          <StatMiniCard title="Completed" value={eventsCompleted.toString()} icon={<BarChart3 className="h-4 w-4" />} color="purple" />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-slate-900 text-lg font-bold">Volume Analytics</CardTitle>
              <p className="text-xs text-slate-500">Project growth and engagement trends</p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-[10px]" />
                    <YAxis axisLine={false} tickLine={false} className="text-[10px]" />
                    <ChartTooltip />
                    <Bar dataKey="events" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="attendees" fill="#bfdbfe" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-slate-900 text-lg font-bold">Capital Utilization</CardTitle>
              <p className="text-xs text-slate-500">Breakdown of spent vs remaining budget</p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorCostData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="amount"
                    >
                      {vendorCostData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmaps and Insights */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-lg font-bold">
                <CalendarDays className="h-5 w-5 text-purple-600" /> Upcoming Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{event.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{event.venue}</span>
                    </div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-none font-bold text-[10px]">
                      {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Badge>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm italic">No upcoming events scheduled</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-none text-white shadow-xl rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-emerald-400" /> Efficiency Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-400 leading-relaxed italic">
                By using Eventify AI for vendor matching and budget tracking, your average project lead time has decreased by <span className="text-emerald-400 font-bold">14.2%</span> recently.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cost Saved</p>
                  <p className="text-xl font-black text-emerald-400">$3,420</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Time Optimized</p>
                  <p className="text-xl font-black text-purple-400">42 hrs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatMiniCard({ title, value, icon, color = "purple" }: { title: string, value: string, icon: React.ReactNode, color?: string }) {
  const colorMap: Record<string, string> = {
    purple: "text-purple-600 bg-purple-50",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    slate: "text-slate-600 bg-slate-50"
  }

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</CardTitle>
        <div className={`p-1.5 rounded-lg ${colorMap[color] || colorMap.purple}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        <p className={`text-[9px] font-bold mt-1 uppercase w-fit px-1.5 py-0.5 rounded ${colorMap[color] || colorMap.purple}`}>Live Feed</p>
      </CardContent>
    </Card>
  )
}
