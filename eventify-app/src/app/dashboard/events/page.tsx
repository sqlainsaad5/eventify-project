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
  MessageSquare
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

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const [eventsRes, organizerRequestsRes] = await Promise.all([
        fetch("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/payments/organizer-requests", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data.created || [])
        setAssignedEvents(data.assigned || [])
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
  }

  const handleAssignmentResponse = async (id: number, status: 'accepted' | 'rejected') => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`http://localhost:5000/api/events/${id}/respond-assignment`, {
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
      const res = await fetch(`http://localhost:5000/api/events/${id}`, {
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

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        ) : (activeTab === "personal" ? events : assignedEvents).filter(e =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())
        ).length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(activeTab === "personal" ? events : assignedEvents).filter(e =>
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((event) => {
                const userId = getUserId()
                const organizerPaid = userId != null && event.organizer_id === userId && organizerRequests.some((r) => r.event_id === event.id && r.status === "paid")
                return (
                <Card key={event.id} className={`group overflow-hidden border-slate-200/60 shadow-sm transition-all duration-500 rounded-[32px] bg-white ${activeTab === "assigned" ? "border-l-4 border-l-emerald-500" : ""} ${organizerPaid ? "opacity-85 border-slate-200 hover:shadow-lg" : "hover:shadow-2xl hover:shadow-purple-100"}`}>
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
                      {organizerPaid && (
                        <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Paid</Badge>
                      )}
                      {activeTab === "assigned" && (
                        <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          Managed Project
                        </Badge>
                      )}
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
                            <div className="text-purple-600 font-black">
                              ${(event.budget / 1000).toFixed(1)}k
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
                              <Badge variant="outline" className={`w-full py-1.5 justify-center rounded-xl border-none font-black text-[9px] uppercase tracking-widest ${event.organizer_status === 'accepted' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                }`}>
                                {event.organizer_status === 'accepted' ? "Vision Active" : "Assignment Declined"}
                              </Badge>

                              {event.organizer_status === "accepted" && (
                                <Button
                                  onClick={() => router.push(`/dashboard/messages?partnerId=${event.user_id}`)}
                                  className="w-full bg-slate-900 hover:bg-black text-white h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 shadow-lg"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Message Client
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
                  {(activeTab === "personal" ? events : assignedEvents).filter(e =>
                    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.vendor_category.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((event) => {
                    const userId = getUserId()
                    const organizerPaid = userId != null && event.organizer_id === userId && organizerRequests.some((r) => r.event_id === event.id && r.status === "paid")
                    return (
                    <tr key={event.id} className={`transition-colors group ${organizerPaid ? "bg-slate-50/80 opacity-90" : "hover:bg-slate-50/80"}`}>
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
                        <span className="font-black text-slate-900">${event.budget.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-32 space-y-1.5">
                          {organizerPaid && (
                            <Badge className="bg-emerald-100 text-emerald-700 font-semibold mb-1">Paid</Badge>
                          )}
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
            <p className="text-slate-500 mt-2 max-w-xs text-center font-medium">No events found matching your search. Start a new project to see it here.</p>
            <Link href="/dashboard/events/new" className="mt-8">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-8">
                Start Planning
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
