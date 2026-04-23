"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, MapPin, Plus, Trash2, MoreVertical, Target, MessageSquare, Wallet, Star } from "lucide-react"
import type { UserDashboardEvent, EventReviewStatus, OrganizerRequest } from "../_lib/types"
import { organizerAdvanceLabel, statusLabel } from "../_lib/partition-user-events"

export function UserCanceledEventCard({ event, onDelete }: { event: UserDashboardEvent; onDelete: (id: number) => void }) {
    return (
        <Card className="group overflow-hidden border-none shadow-lg shadow-slate-200/50 rounded-[40px] bg-white opacity-95">
            <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                    src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80`}
                    className="w-full h-full object-cover grayscale-[35%] opacity-90"
                    alt=""
                />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <Badge className="bg-white/95 backdrop-blur-md text-indigo-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                        {event.vendor_category}
                    </Badge>
                    <Badge className="bg-rose-600/95 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                        Canceled
                    </Badge>
                </div>
            </div>
            <CardContent className="p-8">
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{event.name}</h3>
                        <div className="flex items-center gap-2 text-slate-400 mt-2 text-sm font-bold uppercase tracking-tight">
                            <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{event.venue}</span>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-slate-50 shrink-0">
                                <MoreVertical className="h-5 w-5 text-slate-300" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-[24px] p-2 shadow-2xl border-none">
                            <DropdownMenuItem
                                onClick={() => onDelete(event.id)}
                                className="rounded-xl p-3 cursor-pointer text-red-600 font-bold focus:text-red-600 focus:bg-red-50 gap-3"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove permanently
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                    <div className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">${(event.budget / 1000).toFixed(1)}k</div>
                </div>
            </CardContent>
        </Card>
    )
}

type ActiveCompletedProps = {
    event: UserDashboardEvent
    organizerRequests: OrganizerRequest[]
    reviewStatusByEvent: Record<number, EventReviewStatus>
    onDelete: (id: number) => void
    onOpenApplications: (id: number) => void
    onReviewClick: (payload: { eventId: number; organizerId: number; organizerName: string }) => void
}

export function UserActiveCompletedEventCard({
    event,
    organizerRequests,
    reviewStatusByEvent,
    onDelete,
    onOpenApplications,
    onReviewClick,
}: ActiveCompletedProps) {
    const router = useRouter()
    const requestsForEvent = organizerRequests.filter((r) => r.event_id === event.id)
    const isPaid = requestsForEvent.length > 0 && requestsForEvent.every((r) => r.status !== "pending")
    const hasPendingAdvance = event.status === "pending_advance_payment" && requestsForEvent.some((r) => r.status === "pending")
    const hasPendingRequest = requestsForEvent.some((r) => r.status === "pending")
    const hasPaidRequest = requestsForEvent.some((r) => r.status === "paid")
    const hasRejectedRequest = requestsForEvent.some((r) => r.status === "rejected")
    const advanceStatus = hasPendingRequest
        ? "pending"
        : hasPaidRequest
          ? "paid"
          : hasRejectedRequest
            ? "rejected"
            : undefined

    return (
        <Card
            className={`group overflow-hidden border-none shadow-xl shadow-slate-200/60 transition-all duration-500 rounded-[40px] bg-white ${isPaid ? "opacity-85 border border-slate-200 hover:shadow-xl" : "hover:shadow-2xl hover:shadow-indigo-100"}`}
        >
            <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img
                    src={event.image_url || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt=""
                />
                <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                    <Badge className="bg-white/95 backdrop-blur-md text-indigo-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                        {event.vendor_category}
                    </Badge>
                    {event.status === "completed" && (
                        <Badge className="bg-emerald-600/95 backdrop-blur-md text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                            Completed
                        </Badge>
                    )}
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
                            onClick={() => router.push("/my-events/event-details")}
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
                    {!event.organizer_name && event.status === "created" && (
                        <div className="flex flex-col gap-3 bg-emerald-50 p-4 rounded-3xl border border-emerald-100 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                    <Target className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 leading-none mb-1">Open for organizers</p>
                                    <p className="text-sm font-black text-emerald-900 leading-none">
                                        {event.application_count != null && event.application_count > 0
                                            ? `${event.application_count} application(s)`
                                            : "Organizers can apply"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => onOpenApplications(event.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-black uppercase tracking-widest text-[10px]"
                            >
                                View applications
                            </Button>
                        </div>
                    )}
                    {!event.organizer_name && event.status !== "created" && event.status !== "completed" && (
                        <div
                            onClick={() => router.push("/my-events/event-details")}
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
                            <DropdownMenuContent align="end" className="w-52 rounded-[24px] p-2 shadow-2xl border-none">
                                <DropdownMenuItem
                                    onClick={() => onDelete(event.id)}
                                    className="rounded-xl p-3 cursor-pointer text-red-600 font-bold focus:text-red-600 focus:bg-red-50 gap-3"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {event.status === "completed" ? "Remove from history" : "Cancel event"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">${(event.budget / 1000).toFixed(1)}k</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400 italic">{statusLabel(event.status)}</span>
                            <span className="text-indigo-600">{event.progress}%</span>
                        </div>
                        {advanceStatus && (
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                {organizerAdvanceLabel(advanceStatus)}
                            </div>
                        )}
                        <Progress value={event.progress} className="h-2.5 bg-slate-50 border border-slate-100" />
                    </div>

                    {hasPendingAdvance && (
                        <Button
                            onClick={() => router.push("/my-events/payments")}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-emerald-100"
                        >
                            <Wallet className="h-4 w-4" />
                            Pay 25% Advance
                        </Button>
                    )}

                    {event.organizer_name && event.organizer_status === "accepted" && (
                        <Button
                            onClick={() => router.push(`/my-events/messages?organizerId=${event.organizer_id}`)}
                            className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-slate-200"
                        >
                            <MessageSquare className="h-4 w-4" />
                            Message Expert
                        </Button>
                    )}

                    {event.status === "completed" &&
                        event.organizer_id &&
                        event.organizer_status === "accepted" &&
                        reviewStatusByEvent[event.id]?.can_review_organizer &&
                        !reviewStatusByEvent[event.id]?.my_user_to_organizer && (
                            <Button
                                onClick={() =>
                                    onReviewClick({
                                        eventId: event.id,
                                        organizerId: event.organizer_id!,
                                        organizerName: event.organizer_name || "Organizer",
                                    })
                                }
                                variant="outline"
                                className="w-full border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100 rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] gap-2"
                            >
                                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                                Rate organizer
                            </Button>
                        )}

                    {event.status === "completed" && reviewStatusByEvent[event.id]?.my_user_to_organizer && (
                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            You submitted feedback for this organizer
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
