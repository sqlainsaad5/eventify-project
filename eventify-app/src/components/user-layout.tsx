"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notification-bell"
import {
  Menu,
  X,
  Sparkles,
  Calendar,
  Plus,
  Wallet,
  MessageSquare,
  User,
  LogOut,
  Calculator,
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const navItems = [
  { href: "/my-events", label: "My Events", icon: Calendar },
  { href: "/my-events/event-details", label: "Create Event", icon: Plus },
  { href: "/my-events/budget", label: "Budget Planner", icon: Calculator },
  { href: "/my-events/payments", label: "Payments", icon: Wallet },
  { href: "/my-events/messages", label: "Messages", icon: MessageSquare },
  { href: "/my-profile", label: "Profile", icon: User, exact: true },
]

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const isActive = (item: { href: string; exact?: boolean; label: string }) => {
    if (item.label === "My Events") {
      return pathname === "/my-events"
    }
    if (item.label === "Create Event") {
      return pathname.startsWith("/my-events/event-details")
    }
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  const fetchProfile = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        handleLogout(false)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setUserData(data)
        localStorage.setItem("user", JSON.stringify(data))
      }
    } catch {
      // Ignore profile polling failures in shell.
    }
  }

  const fetchUnreadMessages = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadMessagesCount(data.unread_count || 0)
      } else {
        setUnreadMessagesCount(0)
      }
    } catch {
      setUnreadMessagesCount(0)
    }
  }

  const fetchPendingPayments = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/payments/organizer-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const pending = Array.isArray(data.organizer_requests)
          ? data.organizer_requests.filter((req: any) => req?.status === "pending").length
          : 0
        setPendingPaymentsCount(pending)
      } else {
        setPendingPaymentsCount(0)
      }
    } catch {
      setPendingPaymentsCount(0)
    }
  }

  const handleLogout = (withToast = false) => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    if (withToast) {
      import("sonner").then(({ toast }) => toast.success("Logged out successfully"))
    }
    router.push("/login")
  }

  useEffect(() => {
    const role = localStorage.getItem("role")
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()

    if (!token) {
      router.replace("/login")
      return
    }

    if (role === "organizer") {
      router.replace("/dashboard")
      return
    }
    if (role === "vendor") {
      router.replace("/vendor")
      return
    }
    if (role && role !== "user") {
      router.replace("/login")
      return
    }

    const localUser = localStorage.getItem("user")
    if (localUser) {
      try {
        setUserData(JSON.parse(localUser))
      } catch {
        setUserData(null)
      }
    }

    fetchProfile()
    fetchUnreadMessages()
    fetchPendingPayments()

    const interval = setInterval(() => {
      fetchUnreadMessages()
      fetchPendingPayments()
    }, 30000)

    const onProfileUpdated = () => fetchProfile()
    window.addEventListener("user-profile-updated", onProfileUpdated)
    return () => {
      clearInterval(interval)
      window.removeEventListener("user-profile-updated", onProfileUpdated)
    }
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const activeLabel = useMemo(
    () => navItems.find((item) => isActive(item))?.label || "Dashboard",
    [pathname]
  )

  return (
    <div className="min-h-screen bg-slate-50/60">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200/60 transition-transform duration-300 flex flex-col lg:translate-x-0 shadow-xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-200">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">Eventify</span>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest -mt-0.5">User</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group",
                  active
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-150",
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-600",
                    !active && "group-hover:scale-110"
                  )}
                />
                <span>{item.label}</span>
                {item.label === "Messages" && unreadMessagesCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      active ? "bg-white text-purple-600" : "bg-red-500 text-white"
                    )}
                  >
                    {unreadMessagesCount}
                  </span>
                )}
                {item.label === "Payments" && pendingPaymentsCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[10px] font-bold",
                      active ? "bg-white text-purple-600" : "bg-amber-500 text-white"
                    )}
                  >
                    {pendingPaymentsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={userData?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                {getInitials(userData?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userData?.name || "User"}</p>
              <p className="text-[10px] text-slate-400">User Account</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm"
            onClick={() => handleLogout(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center px-6 py-4 gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 hidden md:block">
              <p className="text-sm text-slate-400 font-medium">{activeLabel}</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              <div className="h-8 w-px bg-slate-200/60 mx-1" />
              <Avatar className="h-9 w-9">
                <AvatarImage src={userData?.profile_image} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                  {getInitials(userData?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
