"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  Briefcase,
  BarChart,
  MessageSquare,
  Calendar,
  User,
  Sparkles,
  LogOut,
} from "lucide-react"

const navItems = [
  { href: "/vendor", label: "Overview", icon: BarChart },
  { href: "/vendor/services", label: "My Services", icon: Briefcase },
  { href: "/vendor/bookings", label: "Bookings", icon: Calendar },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart },
  { href: "/vendor/messages", label: "Messages", icon: MessageSquare },
  { href: "/vendor/profile", label: "Profile", icon: User },
]

export function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token") // remove auth token if stored
    router.push("/login") // redirect to login page
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-[#F3F0FF] transition-transform duration-300 flex flex-col justify-between lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-gray-200">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Vendor Panel</span>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-900">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-purple-50 hover:text-purple-600",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-300">
          <Button
            variant="destructive"
            className="w-full flex items-center gap-2 justify-center"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-end px-6 py-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-900 mr-auto">
              <Menu className="h-6 w-6" />
            </button>
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vendor" />
              <AvatarFallback className="bg-purple-600 text-white">VN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Children */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
