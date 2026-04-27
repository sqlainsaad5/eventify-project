"use client"

import { createContext, useContext, type Dispatch, type RefObject, type SetStateAction } from "react"

export type MarketingUser = { name: string; email: string; profile_image?: string } | null

export type MarketingContextValue = {
  user: MarketingUser
  role: string | null
  setShowAssistant: Dispatch<SetStateAction<boolean>>
  handleSignOut: () => void
  dropdownRef: RefObject<HTMLDivElement | null>
  dropdownOpen: boolean
  setDropdownOpen: Dispatch<SetStateAction<boolean>>
  initials: string
}

const MarketingContext = createContext<MarketingContextValue | null>(null)

export function useMarketing() {
  const v = useContext(MarketingContext)
  if (!v) {
    throw new Error("useMarketing must be used within MarketingLayout")
  }
  return v
}

export { MarketingContext }
