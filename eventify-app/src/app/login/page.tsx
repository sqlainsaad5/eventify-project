"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Sparkles, ArrowRight, Github } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials")
      }

      if (data.token) {
        const cleanToken = data.token.toString().replace(/['"]+/g, '').trim()
        localStorage.setItem("token", cleanToken)
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("role", data.user.role)

        // Sync cookies
        document.cookie = `token=${cleanToken}; path=/;`
        document.cookie = `role=${data.user.role}; path=/;`
      }

      toast.success(`Welcome back, ${data.user.name}!`)

      // Role-based redirect
      setTimeout(() => {
        switch (data.user?.role || "organizer") {
          case "admin":
            router.push("/admin")
            break
          case "vendor":
            router.push("/vendor")
            break
          default:
            router.push("/dashboard")
            break
        }
      }, 500)

    } catch (err: any) {
      toast.error(err.message || "Login failed. Check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google"
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12 font-sans selection:bg-purple-100 selection:text-purple-900">
      <div className="w-full max-w-6xl h-full min-h-[700px] bg-white rounded-[40px] shadow-2xl shadow-purple-100/50 overflow-hidden grid lg:grid-cols-5 border border-slate-100">

        {/* Left column - Branding (2 parts) */}
        <div className="lg:col-span-2 bg-[#09090b] p-12 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] -mr-32 -mt-32 transition-all duration-1000 group-hover:bg-purple-600/30" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] -ml-32 -mb-32 transition-all duration-1000 group-hover:bg-indigo-600/20" />

          <Link href="/" className="flex items-center gap-3 relative z-10 transition-transform active:scale-95 w-fit">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Eventify</span>
          </Link>

          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Create events <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">that leave a mark.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              The only platform you need to design, manage and coordinate world-class events effortlessly.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-slate-500 text-sm font-medium">
            <span>Powered by Eventify AI</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Right column - Connection Form (3 parts) */}
        <div className="lg:col-span-3 p-10 sm:p-20 flex flex-col justify-center bg-white relative">
          <div className="max-w-md w-full mx-auto space-y-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
              <p className="text-slate-500 mt-2 font-medium">Log in to your account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Work Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-14 bg-slate-50 border-transparent focus:bg-white focus:border-purple-200 rounded-2xl text-slate-900 font-medium px-5 transition-all outline-none ring-0 placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Password
                    </label>
                    <Link href="#" className="text-xs font-bold text-purple-600 hover:text-purple-700">Forgot?</Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                    className="h-14 bg-slate-50 border-transparent focus:bg-white focus:border-purple-200 rounded-2xl text-slate-900 font-medium px-5 transition-all outline-none ring-0 placeholder:text-slate-300 text-lg"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] text-base font-bold shadow-xl shadow-purple-100 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 group"
              >
                {loading ? "Authenticating..." : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
                <span className="bg-white px-4">Or use Single Sign-on</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                variant="outline"
                className="h-14 border-slate-100 hover:bg-slate-50 rounded-2xl font-bold text-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 border-slate-100 hover:bg-slate-50 rounded-2xl font-bold text-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <Github className="w-5 h-5" />
                GitHub
              </Button>
            </div>

            <div className="text-center pt-8 border-t border-slate-50">
              <p className="text-sm text-slate-500 font-medium">
                New to the platform?{" "}
                <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-bold transition-colors">
                  Create your workspace
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
