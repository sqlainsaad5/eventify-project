"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Calendar,
    MapPin,
    Plus,
    ArrowLeft,
    Sparkles,
    Loader2,
    Trash2,
    MoreVertical,
    Target,
    MessageSquare
} from "lucide-react"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { NotificationBell } from "@/components/notification-bell"

interface Event {
    id: number
    name: string
    date: string
    venue: string
    budget: number
    progress: number
    vendor_category: string
    image_url?: string
    organizer_id?: number | null
    organizer_name?: string | null
    organizer_status?: string
}

interface OrganizerRequest {
    id: number
    event_id: number
    status: string
}

export default function MyEventsPage() {
    const [events, setEvents] = useState<Event[]>([])
    const [organizerRequests, setOrganizerRequests] = useState<OrganizerRequest[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setLoading(true)
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) {
            setLoading(false)
            return
        }
        try {
            const [eventsRes, requestsRes] = await Promise.all([
                fetch("http://localhost:5000/api/events", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("http://localhost:5000/api/payments/organizer-requests", { headers: { Authorization: `Bearer ${token}` } })
            ])
            if (eventsRes.ok) {
                const data = await eventsRes.json()
                setEvents(data.created || [])
            } else {
                toast.error("Failed to load your events")
            }
            if (requestsRes.ok) {
                const reqData = await requestsRes.json()
                setOrganizerRequests(reqData.organizer_requests || [])
            }
        } catch (err) {
            console.error("Fetch error:", err)
            toast.error("Internal service error")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This event will be permanently removed.")) return

        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        try {
            const res = await fetch(`http://localhost:5000/api/events/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Event removed from your list")
                setEvents(events.filter(e => e.id !== id))
            }
        } catch (err) {
            toast.error("Failed to delete event")
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* ── Header ── */}
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
                            href="/my-events/payments"
                            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                            Payments
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Hero Strip ── */}
            <div
                className="py-16 text-center text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)" }}
            >
                <div className="relative z-10 container mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                        My Added Events
                    </h1>
                    <p className="text-lg text-white/70 font-medium max-w-xl mx-auto">
                        Review and manage the personal visions you've shared with us.
                    </p>
                </div>
            </div>

            {/* ── Content ── */}
            <main className="container mx-auto px-6 py-12 max-w-6xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Retrieving your visions...</p>
                    </div>
                ) : events.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event) => {
                            const requestsForEvent = organizerRequests.filter((r) => r.event_id === event.id)
                            const isPaid = requestsForEvent.length > 0 && requestsForEvent.every((r) => r.status !== "pending")
                            return (
                            <Card key={event.id} className={`group overflow-hidden border-none shadow-xl shadow-slate-200/60 transition-all duration-500 rounded-[40px] bg-white ${isPaid ? "opacity-85 border border-slate-200 hover:shadow-xl" : "hover:shadow-2xl hover:shadow-indigo-100"}`}>
                                <div className="relative h-48 bg-slate-100 overflow-hidden">
                                    <img
                                        src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        alt=""
                                    />
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <Badge className="bg-white/95 backdrop-blur-md text-indigo-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                            {event.vendor_category}
                                        </Badge>
                                        {event.organizer_name && event.organizer_status === "accepted" && (
                                            <Badge className="bg-emerald-500/90 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                                <Target className="h-3 w-3" /> {event.organizer_name}
                                            </Badge>
                                        )}
                                        {event.organizer_name && event.organizer_status === "pending" && (
                                            <Badge className="bg-amber-500/90 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg animate-pulse">
                                                Review Pending
                                            </Badge>
                                        )}
                                        {!event.organizer_name && (
                                            <Badge className="bg-slate-500/90 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                                Self Managed
                                            </Badge>
                                        )}
                                        {event.organizer_status === "rejected" && (
                                            <Badge className="bg-red-500/90 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                                Expert Declined
                                            </Badge>
                                        )}
                                        {isPaid ? (
                                                <Badge className="bg-slate-600/90 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                                    Paid
                                                </Badge>
                                            ) : null}
                                    </div>
                                </div>
                                <CardContent className="p-8">
                                    <div className="mb-6">
                                        {event.organizer_name && event.organizer_status === "accepted" && (
                                            <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-3xl border border-emerald-100 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                                    <Target className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 leading-none mb-1">Expert Active</p>
                                                    <p className="text-sm font-black text-emerald-900 leading-none">{event.organizer_name}</p>
                                                </div>
                                            </div>
                                        )}
                                        {event.organizer_name && event.organizer_status === "pending" && (
                                            <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-3xl border border-amber-100 mb-4 animate-pulse">
                                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                                                    <Plus className="h-5 w-5 animate-spin duration-1000" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 leading-none mb-1">Awaiting Response</p>
                                                    <p className="text-sm font-black text-amber-900 leading-none">{event.organizer_name} is reviewing</p>
                                                </div>
                                            </div>
                                        )}
                                        {event.organizer_status === "rejected" && (
                                            <div
                                                onClick={() => router.push('/event-details')}
                                                className="flex items-center gap-3 bg-red-50 p-4 rounded-3xl border border-red-100 mb-4 cursor-pointer group/status hover:bg-red-100/50 transition-all"
                                            >
                                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 leading-none mb-1">Expert Unavailable</p>
                                                    <p className="text-sm font-black text-red-900 leading-none">Find Another Professional Organizer</p>
                                                </div>
                                            </div>
                                        )}
                                        {!event.organizer_name && (
                                            <div
                                                onClick={() => router.push('/event-details')}
                                                className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-200 mb-4 cursor-pointer hover:bg-slate-100/50 transition-colors group/status"
                                            >
                                                <div className="w-10 h-10 bg-slate-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-100 group-hover/status:scale-110 transition-transform">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Operational State</p>
                                                    <p className="text-sm font-black text-slate-900 leading-none">Self Managed Project</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-2xl font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors tracking-tighter">{event.name}</h3>
                                                <div className="flex items-center gap-2 text-slate-400 mt-2 text-sm font-bold uppercase tracking-tight">
                                                    <MapPin className="h-4 w-4 text-indigo-500" />
                                                    <span className="truncate">{event.venue}</span>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-slate-50 shrink-0">
                                                        <MoreVertical className="h-5 w-5 text-slate-300" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-[24px] p-2 shadow-2xl border-none">
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(event.id)}
                                                        className="rounded-xl p-3 cursor-pointer text-red-600 font-bold focus:text-red-600 focus:bg-red-50 gap-3"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete Vision
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(event.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                                ${(event.budget / 1000).toFixed(1)}k
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400 italic">Planning State</span>
                                                <span className="text-indigo-600">{event.progress}%</span>
                                            </div>
                                            <Progress value={event.progress} className="h-2.5 bg-slate-50 border border-slate-100" />
                                        </div>

                                        {event.organizer_name && event.organizer_status === "accepted" && (
                                            <Button
                                                onClick={() => router.push(`/my-events/messages?organizerId=${event.organizer_id}`)}
                                                className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-slate-200"
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                                Message Expert
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );})}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[60px] shadow-2xl shadow-slate-100 border border-slate-50">
                        <div className="h-24 w-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mb-8 rotate-3">
                            <Calendar className="h-12 w-12 text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Your vision board is empty.</h3>
                        <p className="text-slate-500 mt-3 max-w-sm text-center font-bold text-lg leading-relaxed">
                            Start by sharing your event details with us. We'll show them here.
                        </p>
                        <Link href="/event-details" className="mt-10">
                            <Button className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-black shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                                <Target className="h-6 w-6" /> Share Event Vision
                            </Button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}
