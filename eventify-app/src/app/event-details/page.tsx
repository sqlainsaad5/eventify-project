"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
    ArrowLeft,
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
} from "lucide-react"
import { toast } from "sonner"

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
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [organizers, setOrganizers] = useState<any[]>([])
    const [loadingOrganizers, setLoadingOrganizers] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)

    useEffect(() => {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            setUser(JSON.parse(storedUser))
        }
        fetchOrganizers()
    }, [])

    const fetchOrganizers = async () => {
        try {
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            const res = await fetch("http://localhost:5000/api/auth/organizers", {
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
        if (query.length < 2) { setVenueSuggestions([]); return }
        setLoadingSuggestions(true)
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        try {
            const res = await fetch(`http://localhost:5000/api/events/venue-suggestions?q=${encodeURIComponent(query)}`, {
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
        if (selectedOrgId) {
            formDataToSend.append("organizer_id", selectedOrgId.toString())
        }
        if (selectedFile) {
            formDataToSend.append("image", selectedFile)
        }

        try {
            const response = await fetch("http://localhost:5000/api/events", {
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
                    router.push("/")
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
                        Redirecting you back to the home page...
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
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Home
                    </Link>
                </div>
            </header>

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
                        <Sparkles className="h-4 w-4 animate-pulse" /> Let me know about your Events
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

                        {/* Card: Assign Organizer - MOVED TO FRONT */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/60 overflow-hidden">
                            <div className="px-8 pt-8 pb-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-indigo-600" /> 1. Select Your Event Expert
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest text-[10px] font-black">Choosing who will handle your vision</p>
                                </div>
                                {selectedOrgId && (
                                    <Badge className="bg-indigo-600 text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                                        Expert Selected
                                    </Badge>
                                )}
                            </div>
                            <div className="p-8">
                                {loadingOrganizers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {organizers.map((org: any) => (
                                            <div
                                                key={org.id}
                                                onClick={() => setSelectedOrgId(org.id)}
                                                className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer group flex items-center gap-4 ${selectedOrgId === org.id
                                                    ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100"
                                                    : "border-slate-100 hover:border-indigo-200"
                                                    }`}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg ${selectedOrgId === org.id ? "bg-indigo-600" : "bg-slate-200 group-hover:bg-indigo-400"
                                                    }`}>
                                                    {org.name[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-black tracking-tight truncate ${selectedOrgId === org.id ? "text-indigo-900" : "text-slate-900"}`}>{org.name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Industrial Expert</p>
                                                </div>
                                                {selectedOrgId === org.id && (
                                                    <CheckCircle className="h-5 w-5 text-indigo-600" />
                                                )}
                                            </div>
                                        ))}
                                        {organizers.length === 0 && (
                                            <p className="text-center text-slate-400 py-10 font-bold italic">No organizers available at this moment.</p>
                                        )}
                                    </div>
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
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <Input
                                            id="venue"
                                            required
                                            placeholder="Search venue or enter address..."
                                            className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                                            value={formData.venue}
                                            onChange={(e) => {
                                                setFormData({ ...formData, venue: e.target.value })
                                                fetchVenueSuggestions(e.target.value)
                                            }}
                                            onFocus={() => formData.venue.length > 1 && setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        />
                                        {loadingSuggestions && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-indigo-600" />
                                        )}
                                        {showSuggestions && venueSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 border-2 border-indigo-50">
                                                {venueSuggestions.map((v, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer rounded-2xl flex items-center gap-3 text-sm font-bold transition-colors"
                                                        onMouseDown={() => {
                                                            setFormData({ ...formData, venue: v })
                                                            setShowSuggestions(false)
                                                        }}
                                                    >
                                                        <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                                                        <span className="truncate">{v}</span>
                                                    </div>
                                                ))}
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
                        <div
                            className="p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200"
                            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                        >
                            <h3 className="text-xl font-black mb-3 flex items-center gap-2 tracking-tight">
                                <Sparkles className="h-6 w-6" /> Premium Planning
                            </h3>
                            <p className="text-indigo-100 leading-relaxed text-sm font-bold italic">
                                "A goal without a plan is just a wish." By submitting these details, you're taking the first step toward a flawless execution. Our system will prioritize your request.
                            </p>
                        </div>
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

                        <div className="bg-indigo-50/50 rounded-[32px] p-6 border border-indigo-100">
                            <p className="text-center text-[10px] text-indigo-400 font-black uppercase tracking-tighter leading-relaxed">
                                Secure Submission Powered by Eventify Industrial Cloud
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
