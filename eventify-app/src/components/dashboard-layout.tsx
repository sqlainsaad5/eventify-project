"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Calculator,
  Bell,
  Bot,
  Menu,
  X,
  Sparkles,
  Plus,
  User,
  LogOut,
  Settings,
  MessageSquare
} from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect } from "react"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "My Events", icon: Calendar },
  { href: "/dashboard/vendors", label: "Browse Vendors", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/budget", label: "Budget Planner", icon: Calculator },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/chatbot", label: "AI Assistant", icon: Bot },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  useEffect(() => {
    // 1. Get User Data and Role Security
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user")
      const savedRole = localStorage.getItem("role")

      // Strict Redirection Layer: Isolate the Dashboard based on professional roles
      if (savedRole === "vendor") {
        router.replace("/vendor")
        return
      }

      if (savedRole === "user") {
        router.replace("/my-events")
        return
      }

      if (savedUser) {
        try {
          setUserData(JSON.parse(savedUser))
        } catch (e) {
          console.error("Failed to parse user")
        }
      }
    }

    // 2. Refresh User Data from API to ensure we have the Full Name
    refreshUserData()

    // 3. Initial Notifications Fetch
    fetchNotifications()
    fetchUnreadChatCount()

    // 4. Set Polling Interval
    const interval = setInterval(() => {
      fetchNotifications()
      fetchUnreadChatCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchUnreadChatCount = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return

    try {
      const res = await fetch("http://localhost:5000/api/chat/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadChatCount(data.unread_count || 0)
      }
    } catch (err) {
      console.error("Failed to fetch unread chat count:", err)
    }
  }

  const refreshUserData = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return

    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUserData(data)
        localStorage.setItem("user", JSON.stringify(data))
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err)
    }
  }

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return

    try {
      const res = await fetch("http://localhost:5000/api/payments/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error("Notification sync error:", err)
    }
  }

  const markAsRead = async (n: any) => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return

    try {
      await fetch(`http://localhost:5000/api/payments/notifications/${n.id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      })
      // Local update
      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif))

      if (n.type === "chat") {
        const vendorId = n.extra_data?.sender_id
        router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}` : ""}`)
      } else if (n.type === "service_update") {
        const vendorId = n.extra_data?.vendor_id
        router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}&openServices=true` : ""}`)
      }
    } catch (err) {
      console.error("Fail to mark read")
      if (n.type === "chat") {
        const vendorId = n.extra_data?.sender_id
        router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}` : ""}`)
      } else if (n.type === "service_update") {
        const vendorId = n.extra_data?.vendor_id
        router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}&openServices=true` : ""}`)
      }
    }
  }

  const clearAllNotifications = async () => {
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    if (!token) return

    try {
      const res = await fetch("http://localhost:5000/api/payments/notifications/clear-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
        toast.success("Notifications cleared")
      }
    } catch (err) {
      console.error("Failed to clear notifications")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"

    toast.success("Logged out successfully")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              Eventify
            </span>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-500 hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            <p className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium",
                    isActive
                      ? "bg-purple-50 text-purple-600 shadow-sm shadow-purple-100/50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-purple-600",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn("h-4.5 w-4.5", isActive ? "text-purple-600" : "text-slate-400")} />
                  <span>{item.label}</span>
                  {item.label === "Browse Vendors" && unreadChatCount > 0 && (
                    <span className={cn(
                      "ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isActive ? "bg-purple-600 text-white" : "bg-red-500 text-white"
                    )}>
                      {unreadChatCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={userData?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || "default"}`} />
                <AvatarFallback className="bg-purple-600 text-white text-[10px] font-bold">
                  {userData?.name?.split(" ").map((n: string) => n[0]).join("") || "E"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{userData?.name || "User"}</p>
                <p className="text-[10px] text-slate-400">Organizer Account</p>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                href="/dashboard/profile"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium",
                  pathname === "/dashboard/profile"
                    ? "bg-purple-50 text-purple-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-purple-600"
                )}
              >
                <User className="h-4.5 w-4.5 text-slate-400" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 group"
              >
                <LogOut className="h-4.5 w-4.5 text-slate-400 group-hover:text-red-600" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between px-6 py-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <NotificationBell />

              <div className="h-8 w-[1px] bg-slate-200 mx-1" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 leading-none">
                    {userData?.name || "User"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-tighter capitalize font-bold">
                    Organizer
                  </p>
                </div>
                <Avatar className="h-9 w-9 border-2 border-slate-100 ring-2 ring-purple-50">
                  <AvatarImage src={userData?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || "default"}`} />
                  <AvatarFallback className="bg-purple-600 text-white font-bold">
                    {userData?.name?.split(" ").map((n: string) => n[0]).join("") || "E"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </main>

        {/* Floating action button */}
        <Button
          size="icon"
          onClick={() => router.push("/dashboard/events")}
          className="fixed bottom-8 right-8 h-14 w-14 rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all hover:scale-105 active:scale-95"
          title="Create New Event"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
