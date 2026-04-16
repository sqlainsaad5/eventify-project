"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send reset link")
      toast.success(data.message || "Reset link sent if email exists.")
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Forgot Password</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Enter your email and we will send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-2xl"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-bold">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
