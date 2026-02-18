"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function VerifyEmail() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")
  const [message, setMessage] = useState("Verifying...")

  useEffect(() => {
    if (!token) {
      setMessage("Invalid verification link.")
      return
    }

    fetch(`http://localhost:5000/api/auth/verify-email/${token}`)
      .then(async (res) => {
        const data = await res.json()

        if (res.ok) {
          setMessage(data.message || "Email verified successfully!")
          // Redirect after 2 seconds
          setTimeout(() => router.push("/login"), 2000)
        } else {
          setMessage(data.error || "Invalid or expired link.")
        }
      })
      .catch(() => setMessage("Something went wrong."))
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
        <h1 className="text-2xl font-bold text-purple-600 mb-4">
          Email Verification
        </h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
