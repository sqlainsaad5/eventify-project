"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sparkles,
    ArrowRight,
    Calendar,
    MapPin,
    DollarSign,
    Users,
    Image as ImageIcon,
    Target,
    Loader2,
    CheckCircle,
    CalendarCheck,
    FileText,
    Search,
    Info,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type RatingSide = { avg: number | null; count: number }

type AvailabilityCode = "available" | "limited" | "unavailable"

function normalizeAvailability(a: string | undefined | null): AvailabilityCode {
    const v = (a || "available").toLowerCase()
    if (v === "limited" || v === "unavailable") return v
    return "available"
}

function availabilityLabel(code: AvailabilityCode) {
    switch (code) {
        case "limited":
            return "Limited availability"
        case "unavailable":
            return "Not accepting new events"
        default:
            return "Available"
    }
}

function availabilityBadgeClass(code: AvailabilityCode) {
    switch (code) {
        case "limited":
            return "bg-amber-100 text-amber-900 border-amber-200/80"
        case "unavailable":
            return "bg-rose-100 text-rose-900 border-rose-200/80"
        default:
            return "bg-emerald-100 text-emerald-900 border-emerald-200/80"
    }
}

export default function EventDetailsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [user, setUser] = useState<any>(null)

    const [formData, setFormData] = useState({
        name: "",
        date: "",
        venue: "",
        budget: "",
        vendor_category: "Wedding",
        guest_count: "",
        description: "",
    })

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [venueSuggestions, setVenueSuggestions] = useState<string[]>([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const venueSuggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [organizers, setOrganizers] = useState<any[]>([])
    const [loadingOrganizers, setLoadingOrganizers] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
    const [postForApplications, setPostForApplications] = useState(false)
    const [organizerSummaries, setOrganizerSummaries] = useState<
        Record<number, { organizer: RatingSide; vendor: RatingSide }>
    >({})
    const [organizerPickerOpen, setOrganizerPickerOpen] = useState(false)
    const [organizerSearch, setOrganizerSearch] = useState("")
    const [organizerDetailView, setOrganizerDetailView] = useState<any | null>(null)

    const selectedOrganizer = useMemo(
        () => organizers.find((o: { id: number }) => o.id === selectedOrgId) ?? null,
        [organizers, selectedOrgId],
    )

    const filteredOrganizers = useMemo(() => {
        const q = organizerSearch.trim().toLowerCase()
        if (!q) return organizers
        return organizers.filter((o: any) => {
            return (
                (o.name || "").toLowerCase().includes(q) ||
                (o.city || "").toLowerCase().includes(q) ||
                (o.category || "").toLowerCase().includes(q) ||
                (o.organizer_package_summary || "").toLowerCase().includes(q)
            )
        })
    }, [organizers, organizerSearch])

    useEffect(() => {
        if (organizerPickerOpen) setOrganizerSearch("")
    }, [organizerPickerOpen])

    const getRatingParts = (org: any) => {
        const cnt = org.host_rating_count ?? 0
        const avg = org.host_rating_avg
        if (cnt > 0 && avg != null) {
            return { avg: Number(avg), count: cnt }
        }
        const s = organizerSummaries[org.id]?.organizer
        if (s && s.count > 0) {
            return { avg: s.avg != null ? Number(s.avg) : null, count: s.count }
        }
        return { avg: null as number | null, count: 0 }
    }

    const loadOrganizerSummaries = async (orgs: { id: number }[]) => {
        if (!orgs.length) return
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) return
        try {
            const res = await fetch(`${API_BASE}/api/users/rating-summaries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_ids: orgs.map((o) => o.id) }),
            })
            if (!res.ok) return
            const data = await res.json()
            const summaries = data.summaries || {}
            const map: Record<number, { organizer: RatingSide; vendor: RatingSide }> = {}
            for (const key of Object.keys(summaries)) {
                map[Number(key)] = summaries[key]
            }
            setOrganizerSummaries(map)
        } catch (e) {
            console.error("rating summaries", e)
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            setUser(JSON.parse(storedUser))
        }
        fetchOrganizers()
    }, [])

    useEffect(() => {
        if (!organizers.length) return
        loadOrganizerSummaries(organizers)
        const t = setInterval(() => loadOrganizerSummaries(organizers), 30000)
        return () => clearInterval(t)
    }, [organizers])

    const fetchOrganizers = async () => {
        try {
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            const res = await fetch(`${API_BASE}/api/auth/organizers`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setOrganizers(data)
            }
        } catch (err) {
            console.error("Fetch organizers error:", err)
        } finally {
            setLoadingOrganizers(false)
        }
    }

    const getCurrentDate = () => new Date().toISOString().split("T")[0]

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        } else {
            setSelectedFile(null)
            setPreviewUrl(null)
        }
    }

    const fetchVenueSuggestions = async (query: string) => {
        if (query.length < 2) {
            setVenueSuggestions([])
            setShowSuggestions(false)
            return
        }
        setLoadingSuggestions(true)
        setShowSuggestions(true)
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        try {
            const res = await fetch(`${API_BASE}/api/events/venue-suggestions?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setVenueSuggestions(data.suggestions || [])
                setShowSuggestions(true)
            }
        } catch (err) {
            console.error("Venue suggestion error:", err)
        } finally {
            setLoadingSuggestions(false)
        }
    }

    const scheduleVenueSuggestions = (query: string) => {
        if (venueSuggestTimerRef.current) {
            clearTimeout(venueSuggestTimerRef.current)
            venueSuggestTimerRef.current = null
        }
        if (query.length < 2) {
            setVenueSuggestions([])
            setShowSuggestions(false)
            return
        }
        venueSuggestTimerRef.current = setTimeout(() => {
            venueSuggestTimerRef.current = null
            void fetchVenueSuggestions(query)
        }, 380)
    }

    useEffect(() => {
        return () => {
            if (venueSuggestTimerRef.current) clearTimeout(venueSuggestTimerRef.current)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        if (!token) {
            toast.error("You must be logged in to save event details")
            setLoading(false)
            return
        }

        const formDataToSend = new FormData()
        formDataToSend.append("name", formData.name)
        formDataToSend.append("date", formData.date)
        formDataToSend.append("venue", formData.venue)
        formDataToSend.append("budget", formData.budget)
        formDataToSend.append("vendor_category", formData.vendor_category)
        if (!postForApplications && selectedOrgId) {
            formDataToSend.append("organizer_id", selectedOrgId.toString())
        }
        if (!postForApplications && !selectedOrgId) {
            toast.error("Please select an organizer or choose 'Post for organizers to apply'")
            setLoading(false)
            return
        }
        if (selectedFile) {
            formDataToSend.append("image", selectedFile)
        }

        try {
            const response = await fetch(`${API_BASE}/api/events`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formDataToSend
            })

            if (response.ok) {
                toast.success("Event details saved successfully!")
                setSubmitted(true)
                setTimeout(() => {
                    router.push("/my-events")
                }, 4000)
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || "Failed to save event details")
            }
        } catch (error) {
            console.error("Submit error:", error)
            toast.error("Internal server error. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    // ─── Success Screen ─────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-white rounded-[40px] shadow-2xl shadow-slate-100 p-12 text-center border border-slate-100">
                    <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" }}
                    >
                        <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                        Details Received! 🎉
                    </h2>
                    <p className="text-slate-500 font-medium mb-2 leading-relaxed text-lg">
                        Thank you, <span className="font-black text-indigo-600">{user?.name}</span>!
                    </p>
                    <p className="text-slate-500 font-medium mb-2 leading-relaxed">
                        Your event details for <span className="font-black text-indigo-600">"{formData.name}"</span> have been saved to the database.
                    </p>
                    <p className="text-slate-400 text-sm font-medium mb-10 italic">
                        Redirecting you to My Events...
                    </p>
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    // ─── Main Form ───────────────────────────────────────────────────────────────
    return (
        <div className="font-sans pb-8">

            {/* ── Hero Strip ── */}
            <div
                className="py-16 text-center text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)" }}
            >
                {/* blobs */}
                <div className="absolute top-[-40%] right-[-10%] w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-40%] left-[-10%] w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 border border-white/20 text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles className="h-4 w-4 animate-pulse" /> Create Event
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                        Your Vision, Our Expertise.
                    </h1>
                    <p className="text-lg text-white/70 font-medium max-w-xl mx-auto">
                        Provide your event details below. We'll store them safely and help you bring your vision to life.
                    </p>
                </div>
            </div>

            {/* ── Form ── */}
            <div className="container mx-auto px-6 py-16 max-w-5xl">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ─ Left Column ─ */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Card: Assign Organizer or Post for Applications */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/60 overflow-hidden">
                            <div className="px-8 pt-8 pb-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-indigo-600" /> 1. Select Your Event Expert
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest text-[10px] font-black">Choose now or let organizers apply</p>
                                </div>
                                {postForApplications && (
                                    <Badge className="bg-emerald-600 text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                                        Post for Applications
                                    </Badge>
                                )}
                                {!postForApplications && selectedOrgId && (
                                    <Badge className="bg-indigo-600 text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                                        Expert Selected
                                    </Badge>
                                )}
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="organizerChoice"
                                            checked={!postForApplications}
                                            onChange={() => setPostForApplications(false)}
                                            className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Select an organizer now</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="organizerChoice"
                                            checked={postForApplications}
                                            onChange={() => setPostForApplications(true)}
                                            className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Post for organizers to apply</span>
                                    </label>
                                </div>
                                {postForApplications ? (
                                    <p className="text-slate-500 text-sm font-medium py-4">
                                        Your event will be visible to all active organizers. They can apply and you can choose one from the applications later in My Events.
                                    </p>
                                ) : loadingOrganizers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                    </div>
                                ) : organizers.length === 0 ? (
                                    <p className="text-center text-slate-400 py-10 font-bold italic">
                                        No organizers available at this moment.
                                    </p>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {!selectedOrganizer ? (
                                                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                                                    <p className="text-slate-600 font-medium mb-1 max-w-md mx-auto">
                                                        Open the list to compare organizers: profile photo, host ratings,
                                                        availability, and package summary.
                                                    </p>
                                                    <p className="text-slate-400 text-sm mb-6">
                                                        Works well even when many organizers are on the platform.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        onClick={() => setOrganizerPickerOpen(true)}
                                                        className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-200"
                                                    >
                                                        Select organizer
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
                                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                                        <Avatar className="h-16 w-16 shrink-0 rounded-2xl shadow-md ring-2 ring-indigo-100">
                                                            <AvatarImage
                                                                src={selectedOrganizer.profile_image || undefined}
                                                                alt={selectedOrganizer.name || "Organizer"}
                                                                className="object-cover"
                                                            />
                                                            <AvatarFallback className="rounded-2xl text-xl font-black bg-indigo-600 text-white">
                                                                {(selectedOrganizer.name || "?")[0].toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-black text-lg text-slate-900 truncate">
                                                                    {selectedOrganizer.name || "Organizer"}
                                                                </p>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest border",
                                                                        availabilityBadgeClass(
                                                                            normalizeAvailability(
                                                                                selectedOrganizer.organizer_availability,
                                                                            ),
                                                                        ),
                                                                    )}
                                                                >
                                                                    {availabilityLabel(
                                                                        normalizeAvailability(
                                                                            selectedOrganizer.organizer_availability,
                                                                        ),
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-slate-600">
                                                                {(() => {
                                                                    const rp = getRatingParts(selectedOrganizer)
                                                                    if (rp.count > 0 && rp.avg != null) {
                                                                        return (
                                                                            <>
                                                                                <span className="font-black text-amber-600 tabular-nums">
                                                                                    {rp.avg.toFixed(1)}
                                                                                </span>
                                                                                <span className="text-slate-500">
                                                                                    {" "}
                                                                                    ★ from hosts · {rp.count} review
                                                                                    {rp.count === 1 ? "" : "s"}
                                                                                </span>
                                                                            </>
                                                                        )
                                                                    }
                                                                    return (
                                                                        <span className="text-slate-400 italic">
                                                                            No host reviews yet
                                                                        </span>
                                                                    )
                                                                })()}
                                                            </p>
                                                            {(selectedOrganizer.city || selectedOrganizer.category) && (
                                                                <p className="text-xs text-slate-500 font-medium">
                                                                    {[selectedOrganizer.city, selectedOrganizer.category]
                                                                        .filter(Boolean)
                                                                        .join(" · ")}
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-slate-700 leading-snug line-clamp-3">
                                                                {selectedOrganizer.organizer_package_summary?.trim() ? (
                                                                    selectedOrganizer.organizer_package_summary
                                                                ) : (
                                                                    <span className="text-slate-400 italic">
                                                                        No package summary added by this organizer yet.
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex sm:flex-col gap-2 shrink-0">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => setOrganizerPickerOpen(true)}
                                                            className="rounded-2xl font-black uppercase tracking-widest text-[10px] border-indigo-200"
                                                        >
                                                            Change
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={() => setSelectedOrgId(null)}
                                                            className="rounded-2xl text-slate-500 text-[10px] font-bold uppercase tracking-widest"
                                                        >
                                                            Clear
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Dialog open={organizerPickerOpen} onOpenChange={setOrganizerPickerOpen}>
                                            <DialogContent
                                                className="sm:max-w-2xl w-[calc(100%-1.5rem)] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0"
                                                showCloseButton
                                            >
                                                <DialogHeader className="px-6 pt-6 pb-3 space-y-2 border-b border-slate-100">
                                                    <DialogTitle className="text-xl font-black tracking-tight">
                                                        Choose an organizer
                                                    </DialogTitle>
                                                    <DialogDescription className="text-slate-500 text-sm font-medium">
                                                        Browse photos, ratings, availability, and package notes. Select one
                                                        to assign to this event.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="px-6 py-3">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                        <Input
                                                            placeholder="Search by name, city, category, or package…"
                                                            value={organizerSearch}
                                                            onChange={(e) => setOrganizerSearch(e.target.value)}
                                                            className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-200"
                                                        />
                                                    </div>
                                                </div>
                                                <ScrollArea
                                                    type="always"
                                                    className="h-[min(56rem,max(13rem,calc(90vh-13rem)))] w-full shrink-0 px-6 pb-6"
                                                >
                                                    <div className="space-y-3 pr-3">
                                                        {filteredOrganizers.length === 0 ? (
                                                            <p className="text-center text-slate-400 py-12 font-medium">
                                                                No organizers match your search.
                                                            </p>
                                                        ) : (
                                                            filteredOrganizers.map((org: any) => {
                                                                const av = normalizeAvailability(
                                                                    org.organizer_availability,
                                                                )
                                                                const canSelect = av !== "unavailable"
                                                                const rp = getRatingParts(org)
                                                                const isSelected = selectedOrgId === org.id
                                                                return (
                                                                    <div
                                                                        key={org.id}
                                                                        className={cn(
                                                                            "rounded-2xl border-2 flex flex-col sm:flex-row overflow-hidden transition-all",
                                                                            isSelected
                                                                                ? "border-indigo-600 bg-indigo-50/70 shadow-md shadow-indigo-100/80"
                                                                                : "border-slate-100 bg-white",
                                                                            canSelect &&
                                                                                !isSelected &&
                                                                                "hover:border-indigo-300 hover:bg-indigo-50/40",
                                                                        )}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            disabled={!canSelect}
                                                                            onClick={() => {
                                                                                if (!canSelect) return
                                                                                setSelectedOrgId(org.id)
                                                                                setOrganizerPickerOpen(false)
                                                                            }}
                                                                            className={cn(
                                                                                "flex-1 min-w-0 text-left p-4 flex gap-4 transition-colors",
                                                                                !canSelect && "opacity-55 cursor-not-allowed",
                                                                            )}
                                                                        >
                                                                            <Avatar
                                                                                className={cn(
                                                                                    "h-16 w-16 shrink-0 rounded-2xl shadow-md",
                                                                                    isSelected &&
                                                                                        "ring-2 ring-indigo-500 ring-offset-2",
                                                                                )}
                                                                            >
                                                                                <AvatarImage
                                                                                    src={org.profile_image || undefined}
                                                                                    alt={org.name || "Organizer"}
                                                                                    className="object-cover"
                                                                                />
                                                                                <AvatarFallback
                                                                                    className={cn(
                                                                                        "rounded-2xl text-lg font-black text-white",
                                                                                        isSelected
                                                                                            ? "bg-indigo-600"
                                                                                            : "bg-slate-300",
                                                                                    )}
                                                                                >
                                                                                    {(org.name || "?")[0].toUpperCase()}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex-1 min-w-0 space-y-2">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="font-black text-slate-900 truncate">
                                                                                        {org.name || "Organizer"}
                                                                                    </span>
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className={cn(
                                                                                            "text-[9px] font-black uppercase tracking-widest shrink-0 border",
                                                                                            availabilityBadgeClass(av),
                                                                                        )}
                                                                                    >
                                                                                        {availabilityLabel(av)}
                                                                                    </Badge>
                                                                                </div>
                                                                                <p className="text-xs text-slate-600">
                                                                                    {rp.count > 0 && rp.avg != null ? (
                                                                                        <>
                                                                                            <span className="font-black text-amber-600 tabular-nums">
                                                                                                {rp.avg.toFixed(1)}
                                                                                            </span>
                                                                                            <span className="text-slate-500">
                                                                                                {" "}
                                                                                                ★ from hosts · {rp.count}{" "}
                                                                                                review
                                                                                                {rp.count === 1 ? "" : "s"}
                                                                                            </span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <span className="text-slate-400 italic">
                                                                                            No host reviews yet
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                {(org.city || org.category) && (
                                                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                                                        {[org.city, org.category]
                                                                                            .filter(Boolean)
                                                                                            .join(" · ")}
                                                                                    </p>
                                                                                )}
                                                                                <p className="text-sm text-slate-700 leading-snug line-clamp-3">
                                                                                    {org.organizer_package_summary?.trim() ? (
                                                                                        org.organizer_package_summary
                                                                                    ) : (
                                                                                        <span className="text-slate-400 italic">
                                                                                            No package summary listed.
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                {!canSelect && (
                                                                                    <p className="text-[11px] font-bold text-rose-600">
                                                                                        This organizer is not accepting new
                                                                                        events — pick another.
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            {isSelected && canSelect && (
                                                                                <CheckCircle className="h-6 w-6 shrink-0 text-indigo-600 self-center" />
                                                                            )}
                                                                        </button>
                                                                        <div className="flex items-center justify-center sm:flex-col gap-2 p-3 sm:py-4 sm:px-3 bg-slate-50/90 border-t sm:border-t-0 sm:border-l border-slate-100 shrink-0">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="rounded-xl font-black uppercase tracking-widest text-[9px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 whitespace-nowrap"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    setOrganizerDetailView(org)
                                                                                }}
                                                                            >
                                                                                <Info className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                                                                View Details
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </DialogContent>
                                        </Dialog>

                                        <Sheet
                                            open={organizerDetailView != null}
                                            onOpenChange={(open) => {
                                                if (!open) setOrganizerDetailView(null)
                                            }}
                                        >
                                            <SheetContent
                                                side="right"
                                                className="w-full sm:max-w-lg overflow-y-auto border-slate-200"
                                            >
                                                {organizerDetailView ? (
                                                    <>
                                                        <SheetHeader className="text-left space-y-1 pr-8">
                                                            <SheetTitle className="text-xl font-black tracking-tight">
                                                                {organizerDetailView.name || "Organizer"}
                                                            </SheetTitle>
                                                            <SheetDescription>
                                                                Full profile, ratings, and package notes for this expert.
                                                            </SheetDescription>
                                                        </SheetHeader>
                                                        {(() => {
                                                            const org = organizerDetailView
                                                            const av = normalizeAvailability(org.organizer_availability)
                                                            const canSelect = av !== "unavailable"
                                                            const rp = getRatingParts(org)
                                                            const vr = organizerSummaries[org.id]?.vendor
                                                            return (
                                                                <div className="space-y-6 px-4 pb-8">
                                                                    <Avatar className="h-24 w-24 rounded-2xl shadow-lg ring-2 ring-slate-100">
                                                                        <AvatarImage
                                                                            src={org.profile_image || undefined}
                                                                            alt={org.name || "Organizer"}
                                                                            className="object-cover"
                                                                        />
                                                                        <AvatarFallback className="rounded-2xl text-2xl font-black bg-indigo-600 text-white">
                                                                            {(org.name || "?")[0].toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "text-[10px] font-black uppercase tracking-widest border",
                                                                            availabilityBadgeClass(av),
                                                                        )}
                                                                    >
                                                                        {availabilityLabel(av)}
                                                                    </Badge>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                            Location & focus
                                                                        </p>
                                                                        <p className="text-sm font-bold text-slate-800">
                                                                            {[org.city, org.category].filter(Boolean).join(" · ") ||
                                                                                "Not specified"}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                            Host reviews
                                                                        </p>
                                                                        {rp.count > 0 && rp.avg != null ? (
                                                                            <p className="text-sm text-slate-700">
                                                                                <span className="font-black text-amber-600 tabular-nums text-lg">
                                                                                    {rp.avg.toFixed(1)}
                                                                                </span>
                                                                                <span className="text-slate-600">
                                                                                    {" "}
                                                                                    ★ average from {rp.count} client review
                                                                                    {rp.count === 1 ? "" : "s"} (hosts who booked this organizer).
                                                                                </span>
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-sm text-slate-500 italic">
                                                                                No published host reviews yet.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {vr && vr.count > 0 && vr.avg != null && (
                                                                        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                                Vendor-side reviews
                                                                            </p>
                                                                            <p className="text-sm text-slate-700">
                                                                                <span className="font-black text-indigo-600 tabular-nums text-lg">
                                                                                    {Number(vr.avg).toFixed(1)}
                                                                                </span>
                                                                                <span className="text-slate-600">
                                                                                    {" "}
                                                                                    ★ from {vr.count} review
                                                                                    {vr.count === 1 ? "" : "s"} (as a vendor partner).
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                            Package & services summary
                                                                        </p>
                                                                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                                                            {org.organizer_package_summary?.trim() ? (
                                                                                org.organizer_package_summary
                                                                            ) : (
                                                                                <span className="text-slate-500 italic">
                                                                                    This organizer has not added a package summary yet.
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-2 pt-2">
                                                                        <Button
                                                                            type="button"
                                                                            className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700"
                                                                            disabled={!canSelect}
                                                                            onClick={() => {
                                                                                if (!canSelect) return
                                                                                setSelectedOrgId(org.id)
                                                                                setOrganizerDetailView(null)
                                                                                setOrganizerPickerOpen(false)
                                                                            }}
                                                                        >
                                                                            Select this organizer
                                                                        </Button>
                                                                        {!canSelect && (
                                                                            <p className="text-xs text-rose-600 font-bold text-center">
                                                                                Not accepting new events — choose another organizer.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}
                                                    </>
                                                ) : null}
                                            </SheetContent>
                                        </Sheet>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Card: Core Details */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/60 overflow-hidden">
                            <div className="px-8 pt-8 pb-5 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Target className="h-5 w-5 text-indigo-600" /> Event Core Details
                                </h2>
                                <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest text-[10px] font-black">Essentials</p>
                            </div>
                            <div className="p-8 space-y-6">

                                {/* Event Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Event Title *
                                    </Label>
                                    <div className="relative group">
                                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <Input
                                            id="name"
                                            required
                                            placeholder="e.g. Grand Wedding Gala 2026"
                                            className="h-14 pl-12 bg-slate-50 border-none rounded-2xl text-base font-bold focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Date + Budget */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Event Date *
                                        </Label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <Input
                                                id="date"
                                                required
                                                type="date"
                                                min={getCurrentDate()}
                                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-black focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="budget" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Total Budget ($) *
                                        </Label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <Input
                                                id="budget"
                                                required
                                                type="number"
                                                min="1"
                                                placeholder="5,000"
                                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-black focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                                value={formData.budget}
                                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Venue */}
                                <div className="space-y-2">
                                    <Label htmlFor="venue" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Venue / Location *
                                    </Label>
                                    <p className="text-xs text-slate-500 font-medium leading-snug">
                                        Type at least 2 characters for live place and address suggestions (OpenStreetMap), plus venues you have used before on Eventify.
                                    </p>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <Input
                                            id="venue"
                                            required
                                            placeholder="e.g. Grand Ballroom, or street, city, country…"
                                            className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                            value={formData.venue}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                setFormData({ ...formData, venue: v })
                                                scheduleVenueSuggestions(v)
                                            }}
                                            onFocus={() => {
                                                if (formData.venue.length > 1) setShowSuggestions(true)
                                            }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 220)}
                                        />
                                        {loadingSuggestions && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-indigo-600" />
                                        )}
                                        {showSuggestions && (venueSuggestions.length > 0 || loadingSuggestions) && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 border-2 border-indigo-50">
                                                {loadingSuggestions && venueSuggestions.length === 0 && (
                                                    <div className="px-4 py-3 text-sm font-bold text-slate-500 flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                                        Searching places…
                                                    </div>
                                                )}
                                                {venueSuggestions.map((v, i) => (
                                                    <div
                                                        key={`${i}-${v.slice(0, 24)}`}
                                                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer rounded-2xl flex items-start gap-3 text-sm font-bold transition-colors"
                                                        onMouseDown={() => {
                                                            setFormData({ ...formData, venue: v })
                                                            setShowSuggestions(false)
                                                        }}
                                                    >
                                                        <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                                        <span className="text-left leading-snug break-words">{v}</span>
                                                    </div>
                                                ))}
                                                {!loadingSuggestions &&
                                                    venueSuggestions.length === 0 &&
                                                    formData.venue.trim().length >= 2 && (
                                                        <div className="px-4 py-3 text-sm text-slate-500 font-medium">
                                                            No matches—keep typing or enter the address manually.
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Event Category *
                                    </Label>
                                    <Select
                                        value={formData.vendor_category}
                                        onValueChange={(val) => setFormData({ ...formData, vendor_category: val })}
                                    >
                                        <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-black focus:ring-2 focus:ring-indigo-500/30">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                            {["Wedding", "Conference", "Corporate", "Workshop", "Birthday", "Concert", "Other"].map((cat) => (
                                                <SelectItem key={cat} value={cat} className="rounded-xl py-3 font-bold">
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Additional Details
                                    </Label>
                                    <div className="relative group">
                                        <FileText className="absolute left-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <Textarea
                                            id="description"
                                            rows={4}
                                            placeholder="Tell us more about your Vision..."
                                            className="pl-12 pt-4 bg-slate-50 border-none rounded-2xl font-bold resize-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Planning Tip */}
                        
                    </div>

                    {/* ─ Right Column ─ */}
                    <div className="space-y-6">

                        {/* Cover Image */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-lg overflow-hidden">
                            <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50 text-center">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inspiration Photo</h2>
                            </div>
                            <div className="p-6">
                                <div
                                    className={`relative h-60 rounded-[32px] border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden cursor-pointer ${previewUrl ? "border-indigo-200 bg-indigo-50/10" : "border-slate-100 hover:border-indigo-200 bg-slate-50"
                                        }`}
                                    onClick={() => document.getElementById("cover-image-upload")?.click()}
                                >
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Change Vision</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center space-y-4">
                                            <div className="h-16 w-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto transition-transform hover:scale-110">
                                                <ImageIcon className="h-8 w-8 text-indigo-400" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Concept Image</p>
                                        </div>
                                    )}
                                    <input
                                        id="cover-image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-24 rounded-[40px] text-xl font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 border-none"
                            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" }}
                        >
                            <div className="flex flex-col items-center justify-center gap-1">
                                {loading ? (
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                ) : (
                                    <CalendarCheck className="h-8 w-8" />
                                )}
                                <span className="text-sm mt-1 uppercase tracking-widest font-black">
                                    {loading ? "Recording Vision..." : "Save My Events"}
                                </span>
                            </div>
                        </Button>

                       
                    </div>
                </form>
            </div>
        </div>
    )
}
