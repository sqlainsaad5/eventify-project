"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Calendar,
  DollarSign,
  CheckCircle,
  Loader2,
  MapPin,
  Clock,
  Send,
  Bell,
  X,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"

export default function VendorBookingsPage() {
  const [assignedEvents, setAssignedEvents] = useState<any[]>([])
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [vendorId, setVendorId] = useState<number | null>(null)
  const [token, setToken] = useState("")

  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") === "completed" ? "completed" : "active"

  useEffect(() => {
    const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim() || ""
    const u = JSON.parse(localStorage.getItem("user") || "{}")
    setToken(t)
    setVendorId(u?.id || null)
  }, [])

  useEffect(() => {
    if (vendorId && token) fetchAll()
  }, [vendorId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [eventsRes, notifRes] = await Promise.all([
        // GET assigned events (includes completion status)
        fetch(`http://localhost:5000/api/vendors/assigned_events/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // GET notifications (in-memory, user-scoped)
        fetch(`http://localhost:5000/api/payments/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (eventsRes.ok) {
        const d = await eventsRes.json()
        setAssignedEvents(d.assigned_events || [])
      }
      if (notifRes.ok) {
        const d = await notifRes.json()
        setNotifications(d.notifications || [])
      }

      // Fetch payment requests for completed events
      // Use the vendor bookings endpoint which returns event data
      const paymentsRes = await fetch(
        `http://localhost:5000/api/vendors/${vendorId}/bookings`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (paymentsRes.ok) {
        const d = await paymentsRes.json()
        setPaymentRequests(Array.isArray(d) ? d : [])
      }
    } catch (err) {
      console.error("Fetch error:", err)
      toast.error("Failed to load bookings data")
    } finally {
      setLoading(false)
    }
  }

  // Mark event as done — backend uses PUT /api/vendors/events/<id>/complete
  const handleMarkAsDone = async (eventId: number) => {
    setProcessing(eventId)
    try {
      const res = await fetch(`http://localhost:5000/api/vendors/events/${eventId}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success("Event marked as completed!")
        // Optimistically update UI
        setAssignedEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: "completed" } : e))
        )
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to mark event as done")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setProcessing(null)
    }
  }

  // Request payment — POST /api/payments/request
  const handleRequestPayment = async (eventId: number, amount: number) => {
    setProcessing(eventId)
    try {
      const res = await fetch("http://localhost:5000/api/payments/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId, amount, description: "Vendor service payment" }),
      })
      if (res.ok) {
        toast.success("Payment request submitted! The organizer will review it.")
        fetchAll()
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to submit payment request")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setProcessing(null)
    }
  }

  // Open chat — needs organizer_id as receiver
  const openChat = async (event: any) => {
    setSelectedEvent(event)
    setChatOpen(true)
    setChatLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/chat/event/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setChatMessages(d.messages || [])
      }
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setChatLoading(false)
    }
  }

  // Send message — requires receiver_id (organizer_id)
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedEvent) return
    const msgText = newMessage.trim()
    setNewMessage("")
    try {
      const res = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          receiver_id: selectedEvent.organizer_id, // organizer_id from assigned_events response
          message: msgText,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setChatMessages((prev) => [...prev, d.chat_message])
      } else {
        toast.error("Failed to send message")
      }
    } catch {
      toast.error("Failed to send message")
    }
  }

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const activeEvents = assignedEvents.filter((e) => e.status !== "completed")
  const completedEvents = assignedEvents.filter((e) => e.status === "completed")
  const unreadNotifications = notifications.filter((n) => !n.is_read)

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-emerald-50 text-emerald-700",
      assigned: "bg-purple-50 text-purple-700",
      confirmed: "bg-blue-50 text-blue-700",
      pending: "bg-amber-50 text-amber-700",
    }
    return map[status] || "bg-slate-100 text-slate-600"
  }

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading your bookings...</p>
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
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bookings & Events</h1>
            <p className="text-slate-500 mt-1">
              Manage your assigned events, mark completions, and request payments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifications.length > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-100 px-3 py-1 rounded-full">
                <Bell className="h-3 w-3 mr-1" />
                {unreadNotifications.length} notification{unreadNotifications.length > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={fetchAll}
              className="rounded-xl border-slate-200 text-slate-600"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Notification Banners */}
        {unreadNotifications.length > 0 && (
          <div className="space-y-3">
            {unreadNotifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between bg-amber-50 border border-amber-100 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <Bell className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{n.title || "Payment Update"}</p>
                    <p className="text-sm text-amber-700">{n.message}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-500 hover:text-amber-700 shrink-0"
                  onClick={() => dismissNotification(n.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue={defaultTab}>
          <TabsList className="bg-slate-100 rounded-xl p-1 h-auto">
            <TabsTrigger
              value="active"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2"
            >
              Active Events
              {activeEvents.length > 0 && (
                <Badge className="ml-2 bg-purple-100 text-purple-700 border-none text-[10px] px-1.5">
                  {activeEvents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2"
            >
              Completed
              {completedEvents.length > 0 && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-none text-[10px] px-1.5">
                  {completedEvents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Active Events Tab */}
          <TabsContent value="active" className="mt-6">
            {activeEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="group border-slate-200/60 hover:border-purple-200 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                          {event.name}
                        </CardTitle>
                        <Badge className={`${getStatusColor(event.status)} border-none text-[10px] font-bold uppercase shrink-0`}>
                          {event.status || "Active"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {new Date(event.date).toLocaleDateString("en-US", {
                            weekday: "short", year: "numeric", month: "short", day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {event.venue}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 text-slate-400" />
                          Budget: ${event.budget?.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => handleMarkAsDone(event.id)}
                          disabled={processing === event.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm h-9"
                        >
                          {processing === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Mark Done
                        </Button>
                        <Button
                          onClick={() => openChat(event)}
                          variant="outline"
                          className="flex-1 rounded-xl text-sm h-9 border-slate-200 text-slate-600"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">No active events</p>
                <p className="text-slate-400 text-sm mt-1">
                  You'll see events here once an organizer assigns you.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Completed Events Tab */}
          <TabsContent value="completed" className="mt-6">
            {completedEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedEvents.map((event) => {
                  const paymentAmount = Math.round((event.budget || 0) * 0.8)
                  return (
                    <Card
                      key={event.id}
                      className={`border-slate-200/60 transition-all duration-200 rounded-2xl overflow-hidden ${event.payment_request_status === "paid" ? "opacity-85 border-slate-200 border hover:shadow-sm" : "hover:shadow-md"}`}
                    >
                      <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {event.name}
                          </CardTitle>
                          <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold uppercase shrink-0">
                            Completed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {new Date(event.date).toLocaleDateString("en-US", {
                              weekday: "short", year: "numeric", month: "short", day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {event.venue}
                          </p>
                          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                            <DollarSign className="h-3 w-3" />
                            Estimated Payment: ${paymentAmount.toLocaleString()}
                          </p>
                          {event.verified && !event.payment_request_status && (
                            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified by organizer — you may request payment
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleRequestPayment(event.id, paymentAmount)}
                          disabled={
                            processing === event.id ||
                            !event.verified ||
                            event.payment_request_status != null
                          }
                          className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl text-sm h-9 disabled:opacity-60"
                        >
                          {processing === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <DollarSign className="h-4 w-4 mr-1" />
                          )}
                          {event.payment_request_status === "paid"
                            ? "Paid"
                            : event.payment_request_status === "pending" || event.payment_request_status === "approved"
                              ? "Request submitted"
                              : event.payment_request_status === "rejected"
                                ? "Rejected"
                                : event.verified
                                  ? "Request Payment"
                                  : "Awaiting verification"}
                        </Button>
                        <p className="text-[11px] text-slate-400 text-center">
                          {event.payment_request_status === "paid"
                            ? "You have been paid for this event."
                            : event.payment_request_status
                              ? "One request per event. Wait for organizer to approve or pay."
                              : event.verified
                                ? "The organizer will review and approve your request."
                                : "Complete your work and wait for the organizer to verify before requesting payment."}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">No completed events yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  Mark active events as done to see them here and request payment.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-lg h-[580px] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              {selectedEvent?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Chat with the organizer about this event.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50/40">
            {chatLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="h-10 w-10 mb-2 text-slate-200" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation below.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === vendorId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === vendorId
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-white text-slate-800 rounded-bl-sm border border-slate-100 shadow-sm"
                      }`}
                  >
                    <p>{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === vendorId ? "text-purple-200" : "text-slate-400"}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 pb-5 pt-3 border-t border-slate-100 bg-white">
            {selectedEvent?.organizer_id ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="rounded-xl border-slate-200 focus:ring-purple-500"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400">
                Organizer info not available for this event.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  )
}