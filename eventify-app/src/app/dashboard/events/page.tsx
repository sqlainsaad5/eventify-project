"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  MapPin,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Filter,
  Loader2,
  Clock,
  ExternalLink,
  MessageSquare,
  Star
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { ReviewDialog } from "@/components/review-dialog"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Event {
  id: number
  name: string
  date: string
  venue: string
  budget: number
  progress: number
  vendor_category: string
  image_url?: string
  organizer_status?: string
  user_id?: number
  organizer_id?: number | null
  status?: string
  organizer_advance_paid?: boolean
  organizer_final_paid?: boolean
  completed_vendors?: { id: number; name: string }[]
}

interface AssignedReviewStatus {
  my_organizer_to_vendor: Record<string, Record<string, unknown> | null>
  can_review_vendor_ids: number[]
}

export default function AllEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [assignedEvents, setAssignedEvents] = useState<Event[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<{ event_id: number; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = useState<"personal" | "assigned">("personal")
  const [requestedAdvanceEventIds, setRequestedAdvanceEventIds] = useState<number[]>([])
  const [completingEventId, setCompletingEventId] = useState<number | null>(null)
  const [assignedReviewByEvent, setAssignedReviewByEvent] = useState<Record<number, AssignedReviewStatus>>({})
  const [vendorReviewDialog, setVendorReviewDialog] = useState<{
    eventId: number
    vendorId: number
    vendorName: string
  } | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchAssignedReviewStatuses = async (assigned: Event[]) => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    const targets = assigned.filter((e) => (e.completed_vendors?.length ?? 0) > 0 || e.status === "completed")
    if (targets.length === 0) {
      setAssignedReviewByEvent({})
      return
    }
    const results = await Promise.all(
      targets.map(async (e) => {
        try {
          const res = await fetch(`${API_BASE}/api/events/${e.id}/review-status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return [e.id, null] as const
          const data = await res.json()
          return [
            e.id,
            {
              my_organizer_to_vendor: (data.my_organizer_to_vendor || {}) as Record<
                string,
                Record<string, unknown> | null
              >,
              can_review_vendor_ids: (data.can_review_vendor_ids || []) as number[],
            },
          ] as const
        } catch {
          return [e.id, null] as const
        }
      })
    )
    const next: Record<number, AssignedReviewStatus> = {}
    for (const [id, row] of results) {
      if (row) next[id] = row
    }
    setAssignedReviewByEvent(next)
  }

  useEffect(() => {
    if (assignedEvents.length === 0) return
    fetchAssignedReviewStatuses(assignedEvents)
    const t = setInterval(() => fetchAssignedReviewStatuses(assignedEvents), 30000)
    return () => clearInterval(t)
  }, [assignedEvents])

  useEffect(() => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    fetch(`${API_BASE}/api/payments/notifications/mark-read-by-action`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "assignment_review" }),
    }).then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
    }).catch(() => {})
  }, [])

  const fetchEvents = async (): Promise<Event[]> => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    let assigned: Event[] = []
    try {
      const [eventsRes, organizerRequestsRes] = await Promise.all([
        fetch(`${API_BASE}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/payments/organizer-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data.created || [])
        assigned = data.assigned || []
        setAssignedEvents(assigned)
      } else {
        toast.error("Failed to fetch events")
      }
      if (organizerRequestsRes.ok) {
        const reqData = await organizerRequestsRes.json()
        setOrganizerRequests(reqData.organizer_requests || [])
      }
    } catch (err) {
      console.error("Fetch events error:", err)
      toast.error("An error occurred while fetching events")
    } finally {
      setLoading(false)
    }
    return assigned
  }

  const handleAssignmentResponse = async (id: number, status: 'accepted' | 'rejected') => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/respond-assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success(`Project ${status === 'accepted' ? 'accepted' : 'declined'} successfully`)
        // Refresh events to update status
        fetchEvents()
      } else {
        toast.error("Failed to update status")
      }
    } catch (err) {
      toast.error("Error updating assignment status")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return

    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success("Event deleted successfully")
        setEvents(events.filter(e => e.id !== id))
      } else {
        toast.error("Failed to delete event")
      }
    } catch (err) {
      toast.error("Error deleting event")
    }
  }

  const statusLabel = (status?: string) => {
    switch (status) {
      case "awaiting_organizer_confirmation":
        return "Awaiting Organizer Confirmation"
      case "pending_advance_payment":
        return "Pending Advance Payment"
      case "advance_payment_completed":
        return "25% Payment Completed"
      case "vendor_assigned":
        return "Vendor Assigned"
      case "completed":
        return "Event Completed"
      case "created":
      default:
        return "Created"
    }
  }

  const matchesSearch = (e: Event) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())

  const isCompleted = (e: Event) =>
    (typeof e.status === "string" && e.status.toLowerCase() === "completed") ||
    Number(e.progress || 0) >= 100

  const organizerAdvanceLabel = (status?: string) => {
    switch (status) {
      case "pending":
        return "25% advance requested"
      case "paid":
        return "25% advance paid"
      case "rejected":
        return "25% advance rejected"
      default:
        return status || ""
    }
  }

  const activePersonalEvents = events.filter(e => !isCompleted(e))
  const completedPersonalEvents = events.filter(isCompleted)

  const activeAssignedEvents = assignedEvents.filter(e => !isCompleted(e))
  const completedAssignedEvents = assignedEvents.filter(isCompleted)

  const filteredActivePersonal = activePersonalEvents.filter(matchesSearch)
  const filteredCompletedPersonal = completedPersonalEvents.filter(matchesSearch)
  const filteredActiveAssigned = activeAssignedEvents.filter(matchesSearch)
  const filteredCompletedAssigned = completedAssignedEvents.filter(matchesSearch)

  const activeList = activeTab === "personal" ? filteredActivePersonal : filteredActiveAssigned
  const completedList = activeTab === "personal" ? filteredCompletedPersonal : filteredCompletedAssigned

  const getUserId = (): number | null => {
    try {
      const u = localStorage.getItem("user")
      if (!u) return null
      const parsed = JSON.parse(u)
      return parsed?.id ?? parsed?._id ?? null
    } catch { return null }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 p-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Events</h1>
            <p className="text-slate-500 mt-1 font-medium">Explore and manage all your scheduled high-profile events.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/events/new">
              <Button className="bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-100 rounded-2xl h-12 px-6 group">
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Plan New Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
            <Input
              placeholder="Search by name, venue or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-purple-600/20"
            />
          </div>

          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl gap-1">
            <Button
              variant={activeTab === "personal" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("personal")}
              className={`rounded-xl h-9 px-4 text-xs font-black uppercase tracking-widest ${activeTab === "personal" ? "bg-white shadow-sm text-purple-600" : "text-slate-400"}`}
            >
              My Personal
            </Button>
            <Button
              variant={activeTab === "assigned" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("assigned")}
              className={`rounded-xl h-9 px-4 text-xs font-black uppercase tracking-widest ${activeTab === "assigned" ? "bg-white shadow-sm text-purple-600" : "text-slate-400"}`}
            >
              Assigned Projects {assignedEvents.length > 0 && <Badge className="ml-2 bg-purple-600 text-white border-none text-[8px] h-4 w-4 p-0 flex items-center justify-center">{assignedEvents.length}</Badge>}
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <Button
              variant={viewMode === "grid" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-9 w-9 rounded-xl ${viewMode === "grid" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-9 w-9 rounded-xl ${viewMode === "list" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Events Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Assembling your events...</p>
          </div>
        ) : activeList.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeList.map((event) => {
                const userId = getUserId()
                const organizerAdvancePaid = !!event.organizer_advance_paid
                const organizerFinalPaid = !!event.organizer_final_paid
                const organizerFullyPaid =
                  userId != null &&
                  event.organizer_id === userId &&
                  organizerAdvancePaid &&
                  organizerFinalPaid

                const requestsForEvent = organizerRequests.filter((r) => r.event_id === event.id)

                // Derive 25% advance status: pending/rejected only before it's paid,
                // otherwise show as paid regardless of later 75% requests.
                const hasPendingAdvanceRequest =
                  !organizerAdvancePaid && requestsForEvent.some((r) => r.status === "pending")
                const hasRejectedAdvanceRequest =
                  !organizerAdvancePaid &&
                  !hasPendingAdvanceRequest &&
                  requestsForEvent.some((r) => r.status === "rejected")

                const advanceStatus = organizerAdvancePaid
                  ? "paid"
                  : hasPendingAdvanceRequest
                  ? "pending"
                  : hasRejectedAdvanceRequest
                  ? "rejected"
                  : undefined

                return (
                <Card
                  key={event.id}
                  className={`group overflow-hidden border-slate-200/60 shadow-sm transition-all duration-500 rounded-[32px] bg-white ${
                    activeTab === "assigned" ? "border-l-4 border-l-emerald-500" : ""
                  } ${
                    organizerFullyPaid
                      ? "opacity-85 border-slate-200 hover:shadow-lg"
                      : "hover:shadow-2xl hover:shadow-purple-100"
                  }`}
                >
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={event.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-white/90 backdrop-blur-md text-purple-600 border-none hover:bg-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {event.vendor_category}
                      </Badge>
                      {organizerFullyPaid && (
                        <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Fully Paid</Badge>
                      )}
                      {activeTab === "assigned" && (
                        <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          Managed Project
                        </Badge>
                      )}
                      {event.status === "advance_payment_completed" || event.status === "vendor_assigned" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          25% Advance Payment Completed
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">{event.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 mt-2 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 text-purple-500" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                          <DropdownMenuItem className="rounded-xl p-2.5 cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl p-2.5 cursor-pointer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(event.id)}
                            className="rounded-xl p-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-4">
                      {activeTab === "assigned" && event.organizer_status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAssignmentResponse(event.id, 'accepted')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 rounded-xl font-bold text-xs uppercase tracking-widest"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleAssignmentResponse(event.id, 'rejected')}
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-10 rounded-xl font-bold text-xs uppercase tracking-widest"
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">
                                {statusLabel(event.status)}
                              </span>
                              <span className="text-purple-600 font-black">
                                ${(event.budget / 1000).toFixed(1)}k
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">Project Progress</span>
                              <span className="text-purple-600">{event.progress}%</span>
                            </div>
                            <Progress value={event.progress} className="h-2 bg-slate-100" />
                          </div>

                          {activeTab === "assigned" && (
                            <div className="space-y-3">
                              <Badge
                                variant="outline"
                                className={`w-full py-1.5 justify-center rounded-xl border-none font-black text-[9px] uppercase tracking-widest ${
                                  event.organizer_status === "accepted"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {event.organizer_status === "accepted" ? "Vision Active" : "Assignment Declined"}
                              </Badge>

                              {advanceStatus && (
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                                  {organizerAdvanceLabel(advanceStatus)}
                                </p>
                              )}

                              {event.status === "pending_advance_payment" && requestsForEvent.length === 0 && !requestedAdvanceEventIds.includes(event.id) && (
                                <Button
                                  onClick={async () => {
                                    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
                                    try {
                                      const res = await fetch(
                                        `${API_BASE}/api/events/${event.id}/create-advance-request`,
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
                                        setRequestedAdvanceEventIds((prev) => [...prev, event.id])
                                        toast.success("25% payment request sent to user")
                                        fetchEvents()
                                      } else {
                                        toast.error(data.error || "Failed to create advance request")
                                      }
                                    } catch {
                                      toast.error("Error creating advance request")
                                    }
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 shadow-lg"
                                >
                                  Request 25% Advance
                                </Button>
                              )}
                              {event.status === "pending_advance_payment" && (hasPendingAdvanceRequest || requestedAdvanceEventIds.includes(event.id)) && (
                                <div className="w-full h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200">
                                  Requested
                                </div>
                              )}

                              {event.organizer_status === "accepted" && (
                                <Button
                                  onClick={() => router.push(`/dashboard/messages?partnerId=${event.user_id}`)}
                                  className="w-full bg-slate-900 hover:bg-black text-white h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 shadow-lg"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Message Client
                                </Button>
                              )}

                              {(event.status === "advance_payment_completed" || event.status === "vendor_assigned") &&
                                typeof event.status === "string" &&
                                event.status.toLowerCase() !== "completed" && (
                                  <Button
                                    disabled={completingEventId === event.id}
                                    onClick={async () => {
                                      const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
                                      if (!token) return router.push("/login")
                                      setCompletingEventId(event.id)
                                      try {
                                        const res = await fetch(
                                          `${API_BASE}/api/events/${event.id}/complete`,
                                          { method: "POST", headers: { Authorization: `Bearer ${token}` } }
                                        )
                                        const data = await res.json().catch(() => ({}))
                                        if (res.ok) {
                                          toast.success("Event marked as completed.")
                                          toast("Next step required", {
                                            description: "Open Payments > Organizer Fees and request the remaining 75% payment from the client.",
                                            action: {
                                              label: "Open Organizer Fees",
                                              onClick: () => router.push("/dashboard/payments?tab=organizer"),
                                            },
                                          })
                                          fetchEvents()
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
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 shadow-lg"
                                  >
                                    {completingEventId === event.id ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Completing...
                                      </>
                                    ) : (
                                      "Complete event"
                                    )}
                                  </Button>
                                )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );})}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Location</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeList.map((event) => {
                    const userId = getUserId()
                    const organizerAdvancePaid = !!event.organizer_advance_paid
                    const organizerFinalPaid = !!event.organizer_final_paid
                    const organizerFullyPaid =
                      userId != null &&
                      event.organizer_id === userId &&
                      organizerAdvancePaid &&
                      organizerFinalPaid

                    return (
                    <tr
                      key={event.id}
                      className={`transition-colors group ${
                        organizerFullyPaid ? "bg-slate-50/80 opacity-90" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                            <img src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&q=80`} className="h-full w-full object-cover" alt="" />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{event.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[10px] px-2.5">
                          {event.vendor_category}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-black text-slate-900">Rs. {event.budget.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-40 space-y-1.5">
                          {organizerFullyPaid && (
                            <Badge className="bg-emerald-100 text-emerald-700 font-semibold mb-1">Paid</Badge>
                          )}
                          <div className="text-[10px] font-bold text-slate-500 truncate">
                            {statusLabel(event.status)}
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{event.progress}%</span>
                          </div>
                          <Progress value={event.progress} className="h-1.5 bg-slate-100" />
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} className="h-8 w-8 text-slate-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Quiet on the Event Front</h3>
            <p className="text-slate-500 mt-2 max-w-xs text-center font-medium">No active events found matching your search. Start a new project to see it here.</p>
            <Link href="/dashboard/events/new" className="mt-8">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-8">
                Start Planning
              </Button>
            </Link>
          </div>
        )}
        {!loading && completedList.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Completed {activeTab === "personal" ? "Personal Projects" : "Assigned Projects"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedList.map((event) => (
                <Card key={event.id} className="group overflow-hidden border-slate-200/60 shadow-sm rounded-[32px] bg-slate-50">
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    <img
                      src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt={event.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-white/90 backdrop-blur-md text-purple-600 border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {event.vendor_category}
                      </Badge>
                      <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        Completed
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-500 mt-1 text-xs font-medium">
                          <MapPin className="h-3 w-3 text-purple-500" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Completed On</span>
                        <span className="text-slate-600">
                          {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Final Progress</span>
                        <span className="text-purple-600">100%</span>
                      </div>
                      <Progress value={100} className="h-2 bg-slate-100" />
                      {activeTab === "assigned" &&
                        event.completed_vendors &&
                        event.completed_vendors.length > 0 && (
                          <div className="pt-3 mt-3 border-t border-slate-200 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Rate vendors
                            </p>
                            {event.completed_vendors.map((v) => {
                              const reviewed =
                                assignedReviewByEvent[event.id]?.my_organizer_to_vendor?.[String(v.id)]
                              if (reviewed) {
                                return (
                                  <p
                                    key={v.id}
                                    className="text-xs font-bold text-emerald-600"
                                  >
                                    Reviewed {v.name}
                                  </p>
                                )
                              }
                              return (
                                <Button
                                  key={v.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-xl border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest gap-2"
                                  onClick={() =>
                                    setVendorReviewDialog({
                                      eventId: event.id,
                                      vendorId: v.id,
                                      vendorName: v.name,
                                    })
                                  }
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                  Rate {v.name}
                                </Button>
                              )
                            })}
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <ReviewDialog
          open={vendorReviewDialog !== null}
          onOpenChange={(open) => {
            if (!open) setVendorReviewDialog(null)
          }}
          variant="professional"
          title={vendorReviewDialog ? `Rate ${vendorReviewDialog.vendorName}` : "Rate vendor"}
          description="Your professional rating is visible to this vendor and helps other organizers choose reliable partners."
          onSubmit={async (rating, comment) => {
            if (!vendorReviewDialog) return
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            if (!token) {
              toast.error("Please sign in again")
              return
            }
            const res = await fetch(`${API_BASE}/api/events/${vendorReviewDialog.eventId}/reviews`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                review_type: "organizer_to_vendor",
                subject_id: vendorReviewDialog.vendorId,
                rating,
                comment: comment || undefined,
              }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              toast.error(data.error || "Could not submit review")
              throw new Error(data.error || "submit failed")
            }
            toast.success("Thanks for your feedback")
            const assigned = await fetchEvents()
            await fetchAssignedReviewStatuses(assigned.length ? assigned : assignedEvents)
          }}
        />
      </div>
    </DashboardLayout>
  )
}
