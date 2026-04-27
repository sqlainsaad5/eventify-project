"use client"

import type { ReactNode } from "react"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AIAssistantPanel } from "@/components/ai-assistant-panel"
import { MarketingContext, type MarketingUser } from "./marketing-context"
import { MarketingHeader } from "./marketing-header"
import { MarketingFooter } from "./marketing-footer"
type MarketingLayoutProps = {
  children: ReactNode
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<MarketingUser>(null)
  const [role, setRole] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user")
      const storedRole = localStorage.getItem("role")
      if (storedUser) setUser(JSON.parse(storedUser))
      if (storedRole) setRole(storedRole)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const syncUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch {
        // ignore parse errors
      }
    }

    window.addEventListener("user-profile-updated", syncUserFromStorage)
    window.addEventListener("storage", syncUserFromStorage)
    return () => {
      window.removeEventListener("user-profile-updated", syncUserFromStorage)
      window.removeEventListener("storage", syncUserFromStorage)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = useCallback(() => {
    localStorage.clear()
    setUser(null)
    setRole(null)
    setDropdownOpen(false)
    router.push("/")
  }, [router])

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  const value = useMemo(
    () => ({
      user,
      role,
      setShowAssistant,
      handleSignOut,
      dropdownRef,
      dropdownOpen,
      setDropdownOpen,
      initials,
    }),
    [user, role, dropdownOpen, initials, handleSignOut]
  )

  return (
    <MarketingContext.Provider value={value}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
        <Sheet open={showAssistant} onOpenChange={setShowAssistant}>
          <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
            <SheetTitle className="sr-only">AI Assistant</SheetTitle>
            <div className="flex-1 min-h-0 flex flex-col">
              <AIAssistantPanel />
            </div>
          </SheetContent>
        </Sheet>

        <MarketingHeader />
        <div className="flex-1 flex flex-col">{children}</div>
        <MarketingFooter />
      </div>
    </MarketingContext.Provider>
  )
}
