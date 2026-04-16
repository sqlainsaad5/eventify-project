"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => searchParams.get("token") || "", [searchParams])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error("Invalid reset link.")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }
    if (!strongPasswordRegex.test(password)) {
      toast.error("Password must be at least 8 characters and include uppercase, number, and special character.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reset password")
      toast.success(data.message || "Password reset successful.")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Reset Password</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Use a strong password with uppercase, number and special character.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-2xl"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="h-12 rounded-2xl"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {loading ? "Updating..." : "Update Password"}
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
