"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  Plus,
  TrendingUp,
  AlertCircle,
  Sparkles,
  PieChart,
  ArrowRight,
  Wallet,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"

export default function BudgetPage() {
  const [events, setEvents] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBudgetData()
  }, [])

  const fetchBudgetData = async () => {
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

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        // Merge created and assigned events for full budget overview
        const allEvents = [
          ...(eventsData.created || []),
          ...(eventsData.assigned || [])
        ]
        const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values())
        setEvents(uniqueEvents)
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPayments(paymentsData.payments || [])
      }
    } catch (error) {
      toast.error("Failed to fetch budget metrics")
    } finally {
      setLoading(false)
    }
  }

  const eventList = Array.isArray(events) ? events : []
  const paymentList = Array.isArray(payments) ? payments : []

  const totalAllocated = eventList.reduce((acc, curr) => acc + (curr.budget || 0), 0)
  const totalUsed = paymentList.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  const overallPercentage = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium font-sans">Calculating financials...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
              Budget Master
            </h1>
            <p className="text-slate-500 mt-2">Manage your funds and optimize event spending with AI insights.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/events">
              <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Manage Budgets
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Event Budget</p>
              <h3 className="text-3xl font-black text-slate-900">${totalAllocated.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                <TrendingUp className="h-3 w-3" />
                Active across {events.length} events
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Spent So Far</p>
              <h3 className="text-3xl font-black text-purple-600">${totalUsed.toLocaleString()}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Usage</span>
                  <span>{Math.round(overallPercentage)}%</span>
                </div>
                <Progress value={overallPercentage} className="h-2 bg-slate-100" indicatorClassName="bg-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 border-none text-white shadow-xl shadow-purple-200 rounded-[32px] overflow-hidden">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-100">AI Optimization Tip</span>
              </div>
              <p className="text-sm leading-relaxed text-purple-50 italic">
                {events.length > 0
                  ? "Based on your spending patterns, switching to package deals for photography could save you up to 12% on your next event."
                  : "Start planning an event to get AI suggestions on budget optimization."
                }
              </p>
              <Link href="/dashboard/chatbot">
                <Button variant="link" className="text-white p-0 h-auto mt-4 text-xs font-bold uppercase tracking-widest justify-start hover:opacity-80">
                  Discuss Recommendations <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 text-slate-400 font-bold uppercase tracking-widest text-[11px]">
            <span>Event Budget Breakdown</span>
            <span>Allocated vs Actual</span>
          </div>

          <div className="grid gap-4">
            {events.length > 0 ? (
              events.map((event) => {
                const eventPayments = payments.filter(p => p.event_id === event.id)
                const eventSpent = eventPayments.reduce((sum, p) => sum + p.amount, 0)
                const percentage = event.budget > 0 ? (eventSpent / event.budget) * 100 : 0
                const isDanger = percentage > 90

                return (
                  <Card key={event.id} className="group hover:border-purple-200 transition-all border-slate-200/60 rounded-2xl overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                              "p-2.5 rounded-xl transition-colors",
                              isDanger ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-600"
                            )}>
                              <PieChart className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900">{event.name}</h4>
                                {isDanger && (
                                  <Badge variant="destructive" className="text-[10px] h-5 py-0 px-2 animate-pulse bg-red-100 text-red-600 border-none font-bold">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium font-sans text-muted-foreground">Category: {event.vendor_category}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 w-full md:max-w-xs space-y-2">
                          <div className="flex justify-between items-end text-sm">
                            <span className="font-black text-slate-900">${eventSpent.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">SPENT</span></span>
                            <span className="text-slate-400 italic text-xs font-medium font-sans">Budget: ${event.budget.toLocaleString()}</span>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-2 bg-slate-100 rounded-full"
                            indicatorClassName={isDanger ? "bg-red-500" : "bg-purple-600"}
                          />
                        </div>

                        <div className="hidden md:block">
                          <Link href="/dashboard/events">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-purple-600 rounded-xl">
                              <ArrowRight className="h-5 w-5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900">No active budgets</h3>
                <p className="text-slate-500 text-sm mt-1 mb-6">Create an event to start tracking your finances.</p>
                <Link href="/dashboard/events">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8">
                    Create Event
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
