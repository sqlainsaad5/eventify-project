"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  Briefcase,
  BarChart3,
  MessageSquare,
  Calendar,
  User,
  Sparkles,
  LogOut,
  LayoutDashboard,
  Bell,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { href: "/vendor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/vendor/services", label: "My Services", icon: Briefcase },
  { href: "/vendor/bookings", label: "Bookings", icon: Calendar },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/messages", label: "Messages", icon: MessageSquare },
  { href: "/vendor/profile", label: "Profile", icon: User },
]

export function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState("Vendor")
  const [userInitials, setUserInitials] = useState("VN")
  const [userData, setUserData] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user?.name) {
      setUserName(user.name)
      const parts = user.name.trim().split(" ")
      setUserInitials(
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : parts[0].slice(0, 2).toUpperCase()
      )
    }

    // Fetch unread messages count
    const fetchUnreadCount = async () => {
      const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
      if (!token) return

      try {
        const res = await fetch("http://localhost:5000/api/chat/unread-count", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unread_count || 0)
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err)
      }
    }

    refreshUserData()
    fetchUnreadCount()
    fetchNotifications()

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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
        setUserName(data.name)
        localStorage.setItem("user", JSON.stringify(data))

        const parts = data.name.trim().split(" ")
        setUserInitials(
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : parts[0].slice(0, 2).toUpperCase()
        )
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err)
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
        const organizerId = n.extra_data?.sender_id
        router.push(`/vendor/messages${organizerId ? `?organizerId=${organizerId}` : ""}`)
      }
    } catch (err) {
      console.error("Fail to mark read")
      if (n.type === "chat") {
        const organizerId = n.extra_data?.sender_id
        router.push(`/vendor/messages${organizerId ? `?organizerId=${organizerId}` : ""}`)
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
      }
    } catch (err) {
      console.error("Failed to clear notifications")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200/60 transition-transform duration-300 flex flex-col lg:translate-x-0 shadow-xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-200">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">Eventify</span>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest -mt-0.5">
              Vendor
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
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
                {item.label === "Messages" && unreadCount > 0 && (
                  <span className={cn(
                    "ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-white text-purple-600" : "bg-red-500 text-white"
                  )}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={userData?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400">Vendor Account</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center px-6 py-4 gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumb */}
            <div className="flex-1 hidden md:block">
              <p className="text-sm text-slate-400 font-medium">
                {navItems.find((n) => isActive(n))?.label || "Dashboard"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 rounded-xl">
                    <Bell className="h-5 w-5" />
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center bg-red-500 border-2 border-white text-white text-[10px] font-black rounded-full animate-in zoom-in duration-300">
                        {notifications.filter(n => !n.is_read).length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-[20px] p-2 shadow-2xl border-none ring-1 ring-black/5 bg-white/95 backdrop-blur-xl">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Notifications
                  </DropdownMenuLabel>
                  <div className="max-h-80 overflow-y-auto px-1 space-y-1">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          onClick={() => markAsRead(n)}
                          className={cn(
                            "flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer transition-all border-none focus:bg-slate-50",
                            n.is_read ? "opacity-40" : "bg-purple-50/40"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs text-slate-900">{n.title}</span>
                            {!n.is_read && <span className="w-1.5 h-1.5 bg-purple-600 rounded-full" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug font-medium">{n.message}</p>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="py-10 text-center flex flex-col items-center gap-2">
                        <div className="p-3 bg-slate-50 rounded-full">
                          <Bell className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empty Inbox</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-slate-100 my-2 mx-2" />
                      <DropdownMenuItem
                        onClick={clearAllNotifications}
                        className="justify-center text-[10px] font-black text-purple-600 hover:text-purple-700 uppercase tracking-widest py-2.5 cursor-pointer rounded-xl focus:bg-purple-50"
                      >
                        Clear All Notifications
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-8 w-px bg-slate-200/60 mx-1" />

              <Avatar className="h-9 w-9">
                <AvatarImage src={userData?.profile_image} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
