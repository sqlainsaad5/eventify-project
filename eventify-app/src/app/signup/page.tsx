"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Mail, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "organizer",
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
        router.push("/dashboard")
      } else {
        toast.info("Please contact admin for vendor verification.")
        router.push("/login")
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
            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Join the Future.</h1>
            <p className="text-slate-500 font-medium">Create your account to start planning your next big event.</p>
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

            <div className="space-y-1.5 px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">I am a...</label>
              <div className="flex gap-4">
                {["organizer", "vendor"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={cn(
                      "flex-1 h-12 rounded-2xl text-sm font-bold capitalize transition-all border-2",
                      formData.role === role
                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100"
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {role}
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
