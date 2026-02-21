// app/google-callback/page.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GoogleCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const userId = params.get("user")
    const role = params.get("role")
    const name = params.get("name")
    const email = params.get("email")

    if (token && userId && role) {
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify({
        id: userId,
        name: name || "User",
        email: email || ""
      }))
      localStorage.setItem("role", role)
      document.cookie = `token=${token}; path=/;`
      document.cookie = `role=${role}; path=/;`

      // Role-based redirect
      switch (role) {
        case "admin":
          router.replace("/admin")
          break
        case "vendor":
          router.replace("/vendor")
          break
        case "user":
          router.replace("/")
          break
        default:
          router.replace("/dashboard")
          break
      }
    } else {
      router.replace("/login")
    }
  }, [router])

  return <p className="text-center mt-20">Logging you in...</p>
}
