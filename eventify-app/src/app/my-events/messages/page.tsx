"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
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
    ChevronLeft,
    Circle,
    Sparkles
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function UserMessagesPage() {
    return (
        <div className="min-h-screen bg-slate-50/60">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/my-events" className="flex items-center gap-2 group">
                        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                            <ChevronLeft className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-bold text-slate-600 group-hover:text-indigo-600">Back to Events</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <span className="text-xl font-black text-slate-900 tracking-tighter">Eventify <span className="text-indigo-600">Chat</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/my-events/payments"
                            className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                            Payments
                        </Link>
                    </div>
                </div>
            </nav>

            <Suspense fallback={
                <div className="flex h-[70vh] items-center justify-center">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                </div>
            }>
                <div className="max-w-7xl mx-auto p-6 md:p-8">
                    <UserMessagesContent />
                </div>
            </Suspense>
        </div>
    )
}

function UserMessagesContent() {
    const [partners, setPartners] = useState<any[]>([])
    const [selectedPartner, setSelectedPartner] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [eventsContext, setEventsContext] = useState<any>({})
    const [activeEventId, setActiveEventId] = useState<number | null>(null)

    const [newMessage, setNewMessage] = useState("")
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [msgLoading, setMsgLoading] = useState(false)
    const [sending, setSending] = useState(false)

    const [userId, setUserId] = useState<number | null>(null)
    const [token, setToken] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const initPartnerId = searchParams.get("organizerId")

    useEffect(() => {
        const t = localStorage.getItem("token")?.replace(/['"]+/g, "").trim() || ""
        const u = JSON.parse(localStorage.getItem("user") || "{}")
        setToken(t)
        setUserId(u?.id || null)
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
            const res = await fetch("http://localhost:5000/api/chat/user/conversations", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const d = await res.json()
                // Group by partner (organizer)
                const grouped: any = {}
                d.conversations.forEach((c: any) => {
                    if (!grouped[c.partner_id]) {
                        grouped[c.partner_id] = {
                            id: c.partner_id,
                            name: c.partner_name,
                            email: c.partner_email,
                            role: c.partner_role,
                            events: [],
                            last_message: c.last_message,
                            last_message_time: c.last_message_time,
                            unread_total: 0
                        }
                    }
                    grouped[c.partner_id].events.push({ id: c.event_id, name: c.event_name })
                    grouped[c.partner_id].unread_total += (c.unread_count || 0)

                    if (!grouped[c.partner_id].last_message_time || new Date(c.last_message_time) > new Date(grouped[c.partner_id].last_message_time)) {
                        grouped[c.partner_id].last_message = c.last_message
                        grouped[c.partner_id].last_message_time = c.last_message_time
                    }
                })
                setPartners(Object.values(grouped))
            }
        } catch {
            toast.error("Network error")
        } finally {
            setLoading(false)
        }
    }

    const openFullConversation = async (partner: any) => {
        setSelectedPartner(partner)
        if (partner.events.length > 0) {
            setActiveEventId(partner.events[0].id)
        }

        setMsgLoading(true)
        try {
            const res = await fetch(`http://localhost:5000/api/chat/full-conversation/${partner.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const d = await res.json()
                setMessages(d.messages || [])
                setEventsContext(d.events_context || {})

                // Mark as read
                if (partner.events.length > 0) {
                    await fetch("http://localhost:5000/api/chat/mark-read", {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ event_id: partner.events[0].id }),
                    })
                }

                setPartners((prev) =>
                    prev.map((p) => (p.id === partner.id ? { ...p, unread_total: 0 } : p))
                )
            }
        } catch {
            toast.error("Failed to load messages")
        } finally {
            setMsgLoading(false)
        }
    }

    useEffect(() => {
        if (initPartnerId && partners.length > 0 && !loading) {
            const pid = parseInt(initPartnerId)
            const partner = partners.find(p => p.id === pid)
            if (partner) {
                if (!selectedPartner || selectedPartner.id !== pid) {
                    openFullConversation(partner)
                }
            }
        }
    }, [initPartnerId, partners, loading, selectedPartner])

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedPartner || !activeEventId) {
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
                    receiver_id: selectedPartner.id,
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

    const filtered = partners.filter(
        (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col h-[calc(100vh-160px)]">
            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 flex flex-col bg-white border border-slate-200/60 rounded-[40px] overflow-hidden shadow-2xl shadow-slate-100">
                    <div className="p-6 border-b border-slate-50">
                        <h2 className="text-lg font-black text-slate-900 mb-4">Experts</h2>
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                placeholder="Search experts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 h-11 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-500/20 text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                        {loading ? (
                            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-10 text-center"><p className="text-sm font-bold text-slate-400">No conversations found</p></div>
                        ) : (
                            filtered.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => openFullConversation(p)}
                                    className={`group w-full flex items-center gap-4 p-4 rounded-[24px] transition-all duration-300 ${selectedPartner?.id === p.id
                                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                                        : "hover:bg-slate-50 text-slate-700"
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 group-hover:scale-110 transition-transform">
                                        {p.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <p className="text-sm font-black truncate">{p.name}</p>
                                            <span className="text-[10px] font-bold opacity-60">{formatTime(p.last_message_time)}</span>
                                        </div>
                                        <p className="text-xs truncate font-medium opacity-70">{p.last_message}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col bg-white border border-slate-200/60 rounded-[40px] overflow-hidden shadow-2xl shadow-slate-100 relative">
                    {selectedPartner ? (
                        <>
                            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                                        {selectedPartner.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 leading-none mb-1.5">{selectedPartner.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professional Organizer</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Vision</span>
                                    <select
                                        value={activeEventId || ""}
                                        onChange={(e) => setActiveEventId(Number(e.target.value))}
                                        className="text-xs font-black text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-right appearance-none"
                                    >
                                        {selectedPartner.events.map((ev: any) => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#fafbff]">
                                {msgLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Encrypting Chat...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <p className="font-black text-slate-600">Start your collaboration</p>
                                        <p className="text-sm text-slate-400 mt-1 font-bold">Say hello to {selectedPartner.name}!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMe = msg.sender_id === userId;
                                        const showEventTag = idx === 0 || messages[idx - 1].event_id !== msg.event_id;

                                        return (
                                            <div key={msg.id} className="space-y-2">
                                                {showEventTag && (
                                                    <div className="flex justify-center my-6">
                                                        <span className="bg-white border border-slate-100 text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2 uppercase tracking-widest">
                                                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                                            {eventsContext[msg.event_id] || "Project Vision"}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[70%] space-y-1`}>
                                                        <div className={`px-5 py-4 rounded-[28px] text-sm font-bold shadow-sm ${isMe
                                                            ? "bg-slate-900 text-white rounded-br-none"
                                                            : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                                                            }`}>
                                                            {msg.message}
                                                        </div>
                                                        <p className={`text-[9px] font-black px-2 ${isMe ? "text-right text-slate-400" : "text-left text-slate-300"}`}>
                                                            {formatTime(msg.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-8 bg-[#fafbff]">
                                <div className="bg-white border border-slate-200/60 rounded-[32px] p-2 flex items-center gap-4 shadow-2xl shadow-slate-200/40 focus-within:border-indigo-300 transition-all">
                                    <Input
                                        placeholder={`Message ${selectedPartner.name}...`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                        className="border-none bg-transparent focus-visible:ring-0 shadow-none font-bold text-slate-700 h-12 flex-1 px-4"
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim() || sending}
                                        className="h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 shrink-0"
                                    >
                                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mb-6">
                                <MessageSquare className="h-10 w-10 text-indigo-200" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Collaboration Hub</h2>
                            <p className="text-slate-400 max-w-xs font-bold leading-relaxed">
                                Connect with your professional organizers to refine your vision and coordinate logistics.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
