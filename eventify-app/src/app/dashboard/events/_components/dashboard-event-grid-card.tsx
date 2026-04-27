"use client"

import type { Dispatch, SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  MapPin,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  MessageSquare,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import type { DashboardEvent } from "../_lib/types"

const DEFAULT_IMG = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80"

type Props = {
  event: DashboardEvent
  activeTab: "personal" | "assigned"
  getUserId: () => number | null
  organizerRequests: { event_id: number; status: string }[]
  onDelete: (id: number) => void
  onAssignmentResponse: (id: number, status: "accepted" | "rejected") => void
  onRefetch: () => void
  apiBase: string
  requestedAdvanceEventIds: number[]
  setRequestedAdvanceEventIds: Dispatch<SetStateAction<number[]>>
  completingEventId: number | null
  setCompletingEventId: (id: number | null) => void
  statusLabel: (status?: string) => string
  organizerAdvanceLabel: (status?: string) => string
}

export function DashboardEventGridCard({
  event,
  activeTab,
  getUserId,
  organizerRequests,
  onDelete,
  onAssignmentResponse,
  onRefetch,
  apiBase,
  requestedAdvanceEventIds,
  setRequestedAdvanceEventIds,
  completingEventId,
  setCompletingEventId,
  statusLabel,
  organizerAdvanceLabel,
}: Props) {
  const router = useRouter()
  const userId = getUserId()
  const organizerAdvancePaid = !!event.organizer_advance_paid
  const organizerFinalPaid = !!event.organizer_final_paid
  const organizerFullyPaid =
    userId != null &&
    event.organizer_id === userId &&
    organizerAdvancePaid &&
    organizerFinalPaid

  const requestsForEvent = organizerRequests.filter((r) => r.event_id === event.id)
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
          src={event.image_url || DEFAULT_IMG}
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
            <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Managed Project
            </Badge>
          )}
          {event.status === "advance_payment_completed" || event.status === "vendor_assigned" ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              25% Advance Payment Completed
            </Badge>
          ) : null}
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
              {event.name}
            </h3>
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
                onClick={() => onDelete(event.id)}
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
                onClick={() => onAssignmentResponse(event.id, "accepted")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => onAssignmentResponse(event.id, "rejected")}
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
                  {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500">{statusLabel(event.status)}</span>
                  <span className="text-purple-600 font-black">Rs {(event.budget / 1000).toFixed(1)}k</span>
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
                      event.organizer_status === "accepted" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {event.organizer_status === "accepted" ? "Vision Active" : "Assignment Declined"}
                  </Badge>

                  {advanceStatus && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      {organizerAdvanceLabel(advanceStatus)}
                    </p>
                  )}

                  {event.status === "pending_advance_payment" &&
                    requestsForEvent.length === 0 &&
                    !requestedAdvanceEventIds.includes(event.id) && (
                      <Button
                        onClick={async () => {
                          const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
                          try {
                            const res = await fetch(`${apiBase}/api/events/${event.id}/create-advance-request`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                            })
                            const data = await res.json()
                            if (res.ok) {
                              setRequestedAdvanceEventIds((prev) => [...prev, event.id])
                              toast.success("25% payment request sent to user")
                              onRefetch()
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
                  {event.status === "pending_advance_payment" &&
                    (hasPendingAdvanceRequest || requestedAdvanceEventIds.includes(event.id)) && (
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
                            const res = await fetch(`${apiBase}/api/events/${event.id}/complete`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            const data = await res.json().catch(() => ({}))
                            if (res.ok) {
                              toast.success("Event marked as completed.")
                              toast("Next step required", {
                                description:
                                  "Open Payments > Organizer Fees and request the remaining 75% payment from the client.",
                                action: {
                                  label: "Open Organizer Fees",
                                  onClick: () => router.push("/dashboard/payments?tab=organizer"),
                                },
                              })
                              onRefetch()
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("refresh-notifications"))
                              }
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
  )
}
