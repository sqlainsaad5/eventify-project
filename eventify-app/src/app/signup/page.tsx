"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Mail, Lock, Sparkles, CalendarDays, Building2, ShoppingBag, UserCircle } from "lucide-react"
import { toast } from "sonner"

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  )
}

function SignUpInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromEventCTA = searchParams.get("from") === "event-cta"

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "organizer",   // always default to organizer
  })
  const [loading, setLoading] = useState(false)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("All fields are required!")
      setLoading(false)
      return
    }
    if (!isValidEmail(formData.email)) {
      toast.error("Please enter a valid email address!")
      setLoading(false)
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!")
      setLoading(false)
      return
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters!")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Signup failed")

      toast.success("Account created successfully!")

      if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("role", formData.role)
      }

      if (formData.role === "organizer") {
        // If came from the event CTA, drop them straight into create-event
        router.push(fromEventCTA ? "/dashboard/events/new" : "/dashboard")
      } else if (formData.role === "vendor") {
        toast.info("Please contact admin for vendor verification.")
        router.push("/login")
      } else {
        // 'user' role → home page
        router.push("/")
      }

    } catch (err: any) {
      toast.error(`Signup error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl shadow-purple-100 overflow-hidden grid lg:grid-cols-2 border border-slate-100">
        <div className="p-10 md:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-100">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Eventify</span>
            </div>

            {/* CTA banner */}
            {fromEventCTA && (
              <div
                className="flex items-center gap-3 p-4 rounded-2xl mb-6 text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" }}
              >
                <CalendarDays className="h-5 w-5 shrink-0" />
                <span>Almost there! Create your free account to submit your event details.</span>
              </div>
            )}

            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">
              {fromEventCTA ? "Create Your Account" : "Join the Future."}
            </h1>
            <p className="text-slate-500 font-medium">
              {fromEventCTA
                ? "Sign up as an organizer — it's free. We'll take you straight to your event."
                : "Create your account to start planning your next big event."
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Confirm"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11"
                />
              </div>
            </div>

            <div className="space-y-2 px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">I am a...</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { role: "organizer", label: "Organizer", icon: <Building2 className="h-5 w-5" />, desc: "Plan & manage events" },
                  { role: "vendor", label: "Vendor", icon: <ShoppingBag className="h-5 w-5" />, desc: "Offer services" },
                  { role: "user", label: "User", icon: <UserCircle className="h-5 w-5" />, desc: "Attend & explore" },
                ].map(({ role, label, icon, desc }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl text-sm font-bold capitalize transition-all border-2",
                      formData.role === role
                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100"
                        : "bg-white border-slate-100 text-slate-400 hover:border-purple-200 hover:text-slate-600"
                    )}
                  >
                    {icon}
                    <span className="text-xs font-black">{label}</span>
                    <span className={`text-[9px] font-medium leading-tight text-center ${formData.role === role ? "text-purple-100" : "text-slate-400"
                      }`}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-slate-900 border-none hover:bg-slate-800 text-white rounded-2xl text-base font-bold mt-6 shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-bold underline-offset-4 hover:underline">
              Log In
            </Link>
          </p>
        </div>

        <div className="hidden lg:flex bg-slate-900 flex-col justify-center p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/30 rounded-full blur-[100px] -mr-40 -mt-40" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] -ml-40 -mb-40" />

          <div className="relative z-10 space-y-6">
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter">
              The <span className="text-purple-400">operating system</span> for legendary events.
            </h2>
            <div className="h-1 w-20 bg-purple-500 rounded-full" />
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              From budgeting to vendor discovery, we provide the tools you need to build unforgettable experiences.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
