"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { VendorLayout } from "@/components/vendor-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  RefreshCw,
  User,
  Calendar,
  ChevronRight,
  MoreVertical,
  Circle
} from "lucide-react"
import { toast } from "sonner"

export default function VendorMessagesPage() {
  return (
    <Suspense fallback={
      <VendorLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      </VendorLayout>
    }>
      <VendorMessagesContent />
    </Suspense>
  )
}

function VendorMessagesContent() {
  const [organizers, setOrganizers] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [eventsContext, setEventsContext] = useState<any>({})
  const [activeEventId, setActiveEventId] = useState<number | null>(null)

  const [newMessage, setNewMessage] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const [vendorId, setVendorId] = useState<number | null>(null)
  const [token, setToken] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initOrgId = searchParams.get("organizerId")

  useEffect(() => {
    const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim() || ""
    const u = JSON.parse(localStorage.getItem("user") || "{}")
    setToken(t)
    setVendorId(u?.id || null)
  }, [])

  useEffect(() => {
    if (token) fetchConversations()
  }, [token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/chat/vendor/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        // Group by organizer
        const grouped: any = {}
        d.conversations.forEach((c: any) => {
          if (!grouped[c.organizer_id]) {
            grouped[c.organizer_id] = {
              id: c.organizer_id,
              name: c.organizer_name,
              email: c.organizer_email,
              events: [],
              last_message: c.last_message,
              last_message_time: c.last_message_time,
              unread_total: 0
            }
          }
          grouped[c.organizer_id].events.push({ id: c.event_id, name: c.event_name })
          grouped[c.organizer_id].unread_total += (c.unread_count || 0)

          if (new Date(c.last_message_time) > new Date(grouped[c.organizer_id].last_message_time)) {
            grouped[c.organizer_id].last_message = c.last_message
            grouped[c.organizer_id].last_message_time = c.last_message_time
          }
        })
        setOrganizers(Object.values(grouped))
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  const openFullConversation = async (org: any) => {
    setSelectedOrg(org)
    // Default to the first event if none active
    if (org.events.length > 0) {
      setActiveEventId(org.events[0].id)
    }

    setMsgLoading(true)
    try {
      // Using our new "full-conversation" endpoint
      const res = await fetch(`http://localhost:5000/api/chat/full-conversation/${org.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setMessages(d.messages || [])
        setEventsContext(d.events_context || {})

        // Mark messages for CURRENT active event as read
        if (org.events.length > 0) {
          await fetch("http://localhost:5000/api/chat/mark-read", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ event_id: org.events[0].id }),
          })
        }

        // ✅ Clear chat notifications for this organizer
        try {
          fetch("http://localhost:5000/api/payments/notifications/clear-chat", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sender_id: org.id }),
          });
        } catch (clearErr) {
          console.error("Failed to clear chat notifications:", clearErr);
        }

        // Update unread count locally
        setOrganizers((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, unread_total: 0 } : o))
        )
      }
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setMsgLoading(false)
    }
  }

  useEffect(() => {
    if (initOrgId && organizers.length > 0 && !loading) {
      const oid = parseInt(initOrgId)
      const org = organizers.find(o => o.id === oid)
      if (org) {
        if (!selectedOrg || selectedOrg.id !== oid) {
          openFullConversation(org)
          // Clear URL to prevent auto-reopen issues
          router.replace(pathname, { scroll: false })
        }
      }
    }
  }, [initOrgId, organizers, loading, selectedOrg, pathname, router])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrg || !activeEventId) {
      if (!activeEventId) toast.error("Please select an event context")
      return
    }

    const text = newMessage.trim()
    setNewMessage("")
    setSending(true)
    try {
      const res = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: activeEventId,
          receiver_id: selectedOrg.id,
          message: text,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setMessages((prev) => [...prev, d.chat_message])
      } else {
        toast.error("Failed to send message")
        setNewMessage(text)
      }
    } catch {
      toast.error("Failed to send message")
      setNewMessage(text)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts: string) => {
    if (!ts || ts === "No messages yet") return ""
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ""
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const filtered = organizers.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <VendorLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Conversations</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Messaging Hub</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={fetchConversations}
            className="rounded-xl hover:bg-slate-100 text-slate-400 h-10 w-10 p-0"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Main App Container */}
        <div className="flex-1 flex gap-6 overflow-hidden">

          {/* Sidebar - Contacts */}
          <div className="w-80 flex flex-col bg-white border border-slate-200/60 rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-50">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                <Input
                  placeholder="Seach people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-purple-500/20 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-2 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">No contacts found</p>
                </div>
              ) : (
                filtered.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => openFullConversation(org)}
                    className={`group w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${selectedOrg?.id === org.id
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <div className={`relative shrink-0`}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-lg font-bold shadow-sm ${selectedOrg?.id === org.id ? "from-white/20 to-white/10" : "from-purple-50 to-indigo-50 text-purple-600 border border-purple-100"
                        }`}>
                        {org.name?.charAt(0)}
                      </div>
                      {org.unread_total > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                          {org.unread_total}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold truncate ${selectedOrg?.id === org.id ? "text-white" : "text-slate-900"}`}>
                          {org.name}
                        </p>
                        <span className={`text-[10px] ${selectedOrg?.id === org.id ? "text-purple-100" : "text-slate-400"}`}>
                          {formatTime(org.last_message_time)}
                        </span>
                      </div>
                      <p className={`text-xs truncate font-medium mt-0.5 ${selectedOrg?.id === org.id ? "text-purple-50" : "text-slate-500"}`}>
                        {org.last_message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Main Window */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200/60 rounded-[32px] overflow-hidden shadow-sm relative">
            {selectedOrg ? (
              <>
                {/* Custom Modern Header */}
                <div className="px-8 py-5 flex items-center justify-between bg-white border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold border border-purple-100">
                      {selectedOrg.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-none mb-1">{selectedOrg.name}</h3>
                      <div className="flex items-center gap-2">
                        <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Organizer</span>
                      </div>
                    </div>
                  </div>

                  {/* Event Context Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Context</span>
                      <select
                        value={activeEventId || ""}
                        onChange={(e) => setActiveEventId(Number(e.target.value))}
                        className="text-xs font-bold text-purple-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-right appearance-none"
                      >
                        {selectedOrg.events.map((ev: any) => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-400">
                      <MoreVertical className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-[#fafbff]">
                  {msgLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-400">Securely loading your chats...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-purple-300" />
                      </div>
                      <p className="font-bold text-slate-600">No messages yet with {selectedOrg.name}</p>
                      <p className="text-sm text-slate-400 max-w-xs mt-2">Start talking about your upcoming projects and events here.</p>
                    </div>
                  ) : (
                    // Group messages by Date? (Maybe later)
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === vendorId;
                      const showEventTag = idx === 0 || messages[idx - 1].event_id !== msg.event_id;

                      return (
                        <div key={msg.id} className="space-y-1">
                          {showEventTag && (
                            <div className="flex justify-center my-4">
                              <span className="bg-white border border-slate-100 text-[10px] font-bold text-slate-400 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                Event: {eventsContext[msg.event_id] || "Assigned Event"}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`group relative max-w-[75%] space-y-1`}>
                              <div className={`px-4 py-3 rounded-[24px] text-sm shadow-sm transition-all duration-200 ${isMe
                                ? "bg-purple-600 text-white rounded-br-sm shadow-purple-100 hover:shadow-lg hover:shadow-purple-200"
                                : "bg-white text-slate-800 rounded-bl-sm border border-slate-100 shadow-slate-100/50 hover:shadow-lg"
                                }`}>
                                <p className="font-medium leading-relaxed">{msg.message}</p>
                              </div>
                              <p className={`text-[10px] font-bold px-1 ${isMe ? "text-right text-purple-400" : "text-left text-slate-300"}`}>
                                {msg.timestamp || formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Section - Floating style */}
                <div className="px-8 pb-8 pt-4 bg-[#fafbff]">
                  <div className="bg-white border border-slate-200/60 rounded-[28px] p-2 flex items-center gap-2 shadow-xl shadow-slate-200/50 focus-within:border-purple-300 transition-all duration-300">
                    <div className="hidden sm:flex p-2 hover:bg-slate-50 rounded-full cursor-pointer text-slate-400 transition-colors">
                      <Circle className="h-5 w-5" />
                    </div>
                    <Input
                      placeholder={`Message ${selectedOrg.name} about ${selectedOrg.events.find((e: any) => e.id === activeEventId)?.name || 'event'}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      className="border-none bg-transparent focus-visible:ring-0 shadow-none font-medium text-slate-700"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="h-12 w-12 rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-95 shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">
                    Your conversation is synced across all devices
                  </p>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-purple-50 rounded-[40px] flex items-center justify-center animate-pulse">
                    <MessageSquare className="h-16 w-16 text-purple-200" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <Send className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Select a Person to Chat</h2>
                <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
                  Message any of your organizers to discuss project details, budgets, or logistics. Your chats are organized by person for better clarity.
                </p>
                <div className="mt-8 flex gap-3">
                  <div className="px-5 py-2.5 bg-slate-50 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider">
                    End-to-end synced
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </VendorLayout>
  )
}