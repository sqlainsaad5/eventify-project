"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ChevronDown,
  LogOut,
  User,
  CalendarDays,
  MessageSquare,
  Layout,
  Wallet,
} from "lucide-react"
import { useMarketing } from "./marketing-context"
import { MARKETING_NAV } from "./nav"
import { cn } from "@/lib/utils"

export function MarketingHeader() {
  const pathname = usePathname()
  const {
    user,
    role,
    handleSignOut,
    dropdownRef,
    dropdownOpen,
    setDropdownOpen,
    initials,
  } = useMarketing()

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-12">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            Eventify<span className="text-indigo-600">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {MARKETING_NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-bold uppercase tracking-wide transition-colors",
                  active ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 h-11 px-3 rounded-xl hover:bg-slate-100 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-xl overflow-hidden shadow-lg"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                  >
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt={user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-black">{initials}</div>
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/60 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 font-medium truncate">{user.email}</p>
                    </div>
                    <div className="h-px bg-slate-100 mb-1" />

                    {role === "organizer" && (
                      <>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard/events"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <CalendarDays className="h-4 w-4" />
                          My Events
                        </Link>
                      </>
                    )}

                    {role === "vendor" && (
                      <Link
                        href="/vendor"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <Layout className="h-4 w-4" />
                        Vendor Dashboard
                      </Link>
                    )}

                    {role === "user" && (
                      <>
                        <Link
                          href="/my-events"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <CalendarDays className="h-4 w-4" />
                          My Events
                        </Link>
                        <Link
                          href="/my-events/messages"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Messages
                        </Link>
                        <Link
                          href="/my-events/budget"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <Wallet className="h-4 w-4" />
                          Budget Planner
                        </Link>
                        <Link
                          href="/my-profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          My Profiles
                        </Link>
                      </>
                    )}

                    {role === "organizer" && (
                      <Link
                        href="/dashboard/messages"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Messages
                      </Link>
                    )}

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden md:block text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link href="/signup">
                <Button className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95 font-bold">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
