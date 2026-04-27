"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  MapPin,
  Briefcase,
  Loader2,
  Send,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface OpenEvent {
  id: number
  name: string
  date: string
  venue: string
  budget: number
  vendor_category: string
  image_url?: string
  status?: string
  /** From GET /api/events/open: "declined" if host declined a previous application; organizer may re-apply. */
  my_application_status?: string | null
}

export default function OpenEventsPage() {
  const [events, setEvents] = useState<OpenEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const [applyMessage, setApplyMessage] = useState("")
  const [applyModalEventId, setApplyModalEventId] = useState<number | null>(null)
  const applyModalContext = applyModalEventId
    ? events.find((e) => e.id === applyModalEventId) ?? null
    : null

  useEffect(() => {
    fetchOpenEvents()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    fetch(`${API_BASE}/api/payments/notifications/mark-read-by-action`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "open_events" }),
    }).then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-notifications"))
    }).catch(() => {})
  }, [])

  const fetchOpenEvents = async () => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    try {
      const res = await fetch(`${API_BASE}/api/events/open`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403) {
        toast.error("Only organizers can view open events")
        setEvents([])
        return
      }
      if (res.ok) {
        const data = await res.json()
        setEvents(Array.isArray(data) ? data : [])
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to load open events")
        setEvents([])
      }
    } catch (err) {
      console.error("Fetch open events error:", err)
      toast.error("An error occurred while loading open events")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (eventId: number) => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) {
      toast.error("You must be logged in to apply")
      return
    }
    setApplyingId(eventId)
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: applyMessage.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Application submitted successfully")
        setApplyModalEventId(null)
        setApplyMessage("")
        fetchOpenEvents()
      } else {
        toast.error(data.error || "Failed to submit application")
      }
    } catch (err) {
      toast.error("An error occurred while applying")
    } finally {
      setApplyingId(null)
    }
  }

  const openApplyModal = (eventId: number) => setApplyModalEventId(eventId)
  const closeApplyModal = () => {
    setApplyModalEventId(null)
    setApplyMessage("")
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-indigo-600" />
            Open Events
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Events posted by clients. Apply to get assigned and start planning.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <Card className="rounded-3xl border-slate-100 p-12 text-center">
            <p className="text-slate-500 font-medium">
              No open events at the moment. Check back later or events you applied to are excluded from this list.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="rounded-3xl border-slate-100 shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="h-40 bg-slate-100 overflow-hidden">
                  <img
                    src={event.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-black text-slate-900 truncate">
                      {event.name}
                    </CardTitle>
                    <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold text-[10px] uppercase shrink-0">
                      {event.vendor_category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    {new Date(event.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <span>Rs {Number(event.budget).toLocaleString()} budget</span>
                  </div>
                  <Button
                    onClick={() => openApplyModal(event.id)}
                    className="w-full rounded-xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {event.my_application_status === "declined" ? "Apply again" : "Apply"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Apply modal */}
      {applyModalEventId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeApplyModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900">
              {applyModalContext?.my_application_status === "declined" ? "Apply again" : "Apply to event"}
            </h3>
            <p className="text-sm text-slate-500">
              {applyModalContext?.my_application_status === "declined" ? (
                <>
                  The host declined your last application. You can submit a new message with an updated application.
                </>
              ) : (
                <>Optional: add a short message to the event owner.</>
              )}
            </p>
            <textarea
              placeholder="e.g. I have experience with similar events..."
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              className="w-full min-h-[80px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium resize-y"
              maxLength={500}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeApplyModal}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleApply(applyModalEventId)}
                disabled={applyingId !== null}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700"
              >
                {applyingId === applyModalEventId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
