"use client"

import { useState, useEffect, Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Calendar,
    MapPin,
    DollarSign,
    Sparkles,
    ArrowLeft,
    CalendarCheck,
    Target,
    Image as ImageIcon,
    AlertCircle,
    Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import MapPicker from "../map-picker-leaflet"

interface Location {
    lat: number;
    lng: number;
    address: string;
}

export default function NewEventPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        venue: "",
        budget: "",
        vendor_category: "Wedding",
        image_url: ""
    })

    // Venue Specific States
    const [venueSuggestions, setVenueSuggestions] = useState<string[]>([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
    const [venueCoordinates, setVenueCoordinates] = useState<Location | null>(null)
    const [showMap, setShowMap] = useState(false)

    // Post-Creation States
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

    const fetchVenueSuggestions = async (query: string) => {
        if (query.length < 2) {
            setVenueSuggestions([])
            return
        }

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

    const handleLocationSelect = (location: Location) => {
        setVenueCoordinates(location)
        setFormData(prev => ({ ...prev, venue: location.address }))
        setShowMap(true)
        setIsMapPickerOpen(false)
    }

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        } else {
            setSelectedFile(null)
            setPreviewUrl(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()

        // Use FormData for file upload
        const formDataToSend = new FormData()
        formDataToSend.append("name", formData.name)
        formDataToSend.append("date", formData.date)
        formDataToSend.append("venue", formData.venue)
        formDataToSend.append("budget", formData.budget)
        formDataToSend.append("vendor_category", formData.vendor_category)
        if (selectedFile) {
            formDataToSend.append("image", selectedFile)
        }

        try {
            const res = await fetch("http://localhost:5000/api/events", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formDataToSend
            })

            const data = await res.json()
            if (res.ok) {
                toast.success("Event created successfully!")
                if (data.suggestions) {
                    setAiSuggestions(data.suggestions)
                    // Wait a bit to show suggestions before redirecting, or just redirect
                    setTimeout(() => router.push("/dashboard/events"), 2000)
                } else {
                    router.push("/dashboard/events")
                }
            } else {
                toast.error(data.error || "Failed to create event")
            }
        } catch (err) {
            toast.error("An error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const getCurrentDate = () => {
        return new Date().toISOString().split("T")[0]
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Navigation */}
                <Link href="/dashboard/events" className="inline-flex items-center text-slate-500 hover:text-purple-600 font-bold text-sm group transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Events
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Create Masterpiece</h1>
                        <p className="text-slate-500 font-medium">Define the core pillars of your next legendary event.</p>
                    </div>
                    <div className="bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">AI Assisted Planning</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-[40px] border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                                <CardTitle className="text-xl">Event Core Details</CardTitle>
                                <CardDescription>Foundational information for your project</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-400">Event Title</Label>
                                    <div className="relative group">
                                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                        <Input
                                            id="name"
                                            required
                                            placeholder="e.g. Sapphire Galaxy Gala 2026"
                                            className="h-14 pl-12 bg-slate-50 border-none rounded-2xl text-lg font-semibold focus-visible:ring-2 focus-visible:ring-purple-600/20"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="date" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-400">Scheduled Date</Label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                            <Input
                                                id="date"
                                                required
                                                type="date"
                                                min={getCurrentDate()}
                                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-purple-600/20"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="budget" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-400">Project Budget ($)</Label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                            <Input
                                                id="budget"
                                                required
                                                type="number"
                                                placeholder="50,000"
                                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-purple-600/20"
                                                value={formData.budget}
                                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="venue" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-400">Selected Venue</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                            <Input
                                                id="venue"
                                                required
                                                placeholder="e.g. Grand Ballroom or search..."
                                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-semibold focus-visible:ring-2 focus-visible:ring-purple-600/20"
                                                value={formData.venue}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, venue: e.target.value })
                                                    fetchVenueSuggestions(e.target.value)
                                                }}
                                                onFocus={() => formData.venue.length > 1 && setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            />

                                            {/* Loading Indicator */}
                                            {loadingSuggestions && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                                </div>
                                            )}

                                            {/* Suggestions Dropdown */}
                                            {showSuggestions && venueSuggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2">
                                                    {venueSuggestions.map((venue, index) => (
                                                        <div
                                                            key={index}
                                                            className="px-4 py-3 hover:bg-purple-50 cursor-pointer rounded-xl flex items-center gap-3 transition-colors text-sm font-medium"
                                                            onMouseDown={() => {
                                                                setFormData({ ...formData, venue })
                                                                setShowSuggestions(false)
                                                            }}
                                                        >
                                                            <MapPin className="h-4 w-4 text-purple-600" />
                                                            {venue}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => setIsMapPickerOpen(true)}
                                            className="h-14 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-sm flex items-center gap-2"
                                        >
                                            <MapPin className="h-4 w-4" />
                                            Map
                                        </Button>
                                    </div>
                                    {venueCoordinates && (
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-1">
                                            📍 Lat: {venueCoordinates.lat.toFixed(4)} Lng: {venueCoordinates.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>

                                {/* Map Preview */}
                                {showMap && formData.venue && (
                                    <div className="mt-4 rounded-3xl overflow-hidden border border-slate-100 group relative">
                                        <iframe
                                            width="100%"
                                            height="200"
                                            frameBorder="0"
                                            style={{ border: 0 }}
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${venueCoordinates
                                                ? `${venueCoordinates.lng - 0.01},${venueCoordinates.lat - 0.01},${venueCoordinates.lng + 0.01},${venueCoordinates.lat + 0.01}`
                                                : "73.0479,33.6844,73.0579,33.6944"
                                                }&layer=mapnik&marker=${venueCoordinates
                                                    ? `${venueCoordinates.lat},${venueCoordinates.lng}`
                                                    : "33.6844,73.0479"
                                                }`}
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="bg-white/90 backdrop-blur-md h-7 text-[10px] font-bold uppercase tracking-wider rounded-lg"
                                                onClick={() => setShowMap(false)}
                                            >
                                                Hide Map
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[40px] text-white shadow-2xl shadow-purple-200">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Planning Wisdom
                            </h3>
                            <p className="text-indigo-50 leading-relaxed italic opacity-90 text-sm">
                                Pro tip: Events with a defined budget and location 90 days in advance see a 24% increase in vendor response rates. We'll help you find the best matches once you're set.
                            </p>
                        </div>

                        {aiSuggestions.length > 0 && (
                            <Card className="rounded-[40px] border-emerald-100 bg-emerald-50/30 overflow-hidden shadow-sm">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-emerald-700 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" /> AI Recommendations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-0 space-y-3">
                                    {aiSuggestions.map((s, i) => (
                                        <div key={i} className="flex gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                            <span className="text-emerald-500 font-black">0{i + 1}</span>
                                            <p className="text-slate-600 text-sm font-medium">{s}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="rounded-[40px] border-slate-100 shadow-lg overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                                <CardTitle className="text-lg">Visual & Category</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Event Category</Label>
                                    <Select
                                        value={formData.vendor_category}
                                        onValueChange={(val) => setFormData({ ...formData, vendor_category: val })}
                                    >
                                        <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-purple-600/20">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                            {["Wedding", "Conference", "Corporate", "Workshop", "Birthday", "Concert"].map((cat) => (
                                                <SelectItem key={cat} value={cat} className="rounded-xl py-3 font-medium">
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Event Cover Image</Label>
                                    <div
                                        className={`relative h-48 rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${previewUrl ? "border-purple-200 bg-purple-50/10" : "border-slate-200 hover:border-purple-300 bg-slate-50"
                                            }`}
                                    >
                                        {previewUrl ? (
                                            <>
                                                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-8 rounded-xl bg-white text-slate-900"
                                                        onClick={() => document.getElementById('image-upload')?.click()}
                                                    >
                                                        Change Photo
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto text-slate-400">
                                                    <ImageIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Browse System</p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-4 font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                    onClick={() => document.getElementById('image-upload')?.click()}
                                                >
                                                    Choose File
                                                </Button>
                                            </div>
                                        )}
                                        <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-20 bg-slate-900 border-none hover:bg-slate-800 text-white rounded-[32px] text-lg font-black shadow-2xl shadow-slate-300 transition-all hover:scale-[1.02] active:scale-95 group"
                        >
                            <div className="flex items-center justify-center gap-3">
                                {loading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                                ) : (
                                    <CalendarCheck className="h-6 w-6 text-purple-400 group-hover:rotate-12 transition-transform" />
                                )}
                                <span>{loading ? "Materializing..." : "Initialize Event"}</span>
                            </div>
                        </Button>


                    </div>
                </form>
            </div>

            <Suspense fallback={null}>
                <MapPicker
                    isOpen={isMapPickerOpen}
                    onClose={() => setIsMapPickerOpen(false)}
                    onLocationSelect={handleLocationSelect}
                    initialLocation={venueCoordinates || undefined}
                />
            </Suspense>
        </DashboardLayout>
    )
}
