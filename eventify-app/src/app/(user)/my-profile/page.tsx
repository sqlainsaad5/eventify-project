"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    User,
    Mail,
    Phone,
    MapPin,
    Loader2,
    Camera,
    CheckCircle,
    ShieldCheck,
    Zap
} from "lucide-react"
import { toast } from "sonner"

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    role: string;
    profile_image?: string;
}

export default function MyProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [userData, setUserData] = useState<UserData>({
        id: "",
        name: "",
        email: "",
        phone: "",
        city: "",
        role: "",
        profile_image: ""
    })
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchUserProfile()
    }, [])

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
            const response = await fetch("http://localhost:5000/api/auth/profile", {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setUserData(data.user)
                localStorage.setItem("user", JSON.stringify(data.user))
                window.dispatchEvent(new Event("user-profile-updated"))
            }
        } catch (error) {
            console.error("Profile fetch error:", error)
            toast.error("Failed to load profile details")
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        const reader = new FileReader()
        reader.onloadend = async () => {
            try {
                const token = localStorage.getItem("token")?.replace(/['"]+/g, '').trim()
                const base64Data = reader.result as string

                const response = await fetch("http://localhost:5000/api/auth/profile/upload-image", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ image_data: base64Data })
                })

                if (response.ok) {
                    const data = await response.json()
                    setUserData(data.user)
                    localStorage.setItem("user", JSON.stringify(data.user))
                    window.dispatchEvent(new Event("user-profile-updated"))
                    toast.success("Profile photo updated!")
                }
            } catch (error) {
                toast.error("Photo upload failed")
            } finally {
                setUploading(false)
            }
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const token = localStorage.getItem("token")?.replace(/['"]+/g, '').trim()
            const response = await fetch("http://localhost:5000/api/auth/profile/update", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: userData.name,
                    phone: userData.phone,
                    city: userData.city
                })
            })

            if (response.ok) {
                const data = await response.json()
                setUserData(data.user)
                localStorage.setItem("user", JSON.stringify(data.user))
                window.dispatchEvent(new Event("user-profile-updated"))
                setIsEditing(false)
                toast.success("Profile details synchronized!")
            }
        } catch (error) {
            toast.error("Update failed")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            </div>
        )
    }

    const getInitials = (name: string) => {
        return name?.split(' ').map(word => word[0]).join('').toUpperCase() || "U"
    }

    return (
        <div className="font-sans pb-8">
            {/* ── Hero Strip ── */}
            <div
                className="py-16 text-center text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)" }}
            >
                <div className="relative z-10 container mx-auto px-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <ShieldCheck className="h-3.5 w-3.5" /> Secure Account Management
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                        My Profiles
                    </h1>
                    <p className="text-lg text-white/70 font-medium max-w-xl mx-auto">
                        Manage your high-level identity and contact credentials.
                    </p>
                </div>
            </div>

            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <Card className="rounded-[48px] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white">
                    <CardHeader className="p-10 md:p-14 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-col items-center md:items-start gap-6">
                            <div className="relative group">
                                <Avatar className="h-28 w-28 shadow-2xl ring-4 ring-white">
                                    {userData.profile_image ? (
                                        <AvatarImage src={userData.profile_image} className="object-cover" />
                                    ) : null}
                                    <AvatarFallback className="bg-indigo-600 text-white text-3xl font-black">
                                        {getInitials(userData.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <Label htmlFor="photo-upload" className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all border border-slate-100">
                                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : <Camera className="h-5 w-5 text-indigo-600" />}
                                    <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                </Label>
                            </div>
                            <div className="text-center md:text-left">
                                <CardTitle className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{userData.name}</CardTitle>
                                <CardDescription className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mt-1 flex items-center justify-center md:justify-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Certified User Account
                                </CardDescription>
                            </div>
                        </div>

                        {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] font-black shadow-xl shadow-slate-100 transition-all hover:scale-105 active:scale-95">
                                Modify Details
                            </Button>
                        ) : (
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setIsEditing(false)} className="h-14 px-8 border-2 border-slate-100 rounded-[20px] font-black hover:bg-slate-50">
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95">
                                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                                    Save Vision
                                </Button>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="p-10 md:p-14">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <Input
                                        value={userData.name}
                                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="Enter full name"
                                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:opacity-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verified Email (Static)</Label>
                                <div className="relative group cursor-not-allowed">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 transition-colors" />
                                    <Input
                                        value={userData.email}
                                        disabled={true}
                                        className="h-14 pl-12 bg-slate-50/50 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Coordinate</Label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <Input
                                        value={userData.phone || ""}
                                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="Connect phone number"
                                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:opacity-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Base Location</Label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <Input
                                        value={userData.city || ""}
                                        onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="Set city"
                                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:opacity-100"
                                    />
                                </div>
                            </div>
                        </div>

                        
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
