"use client"

import { useCallback, useState, useEffect } from "react"
import { toast } from "sonner"
import type { DashboardEvent } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function useOrganizerAssignedEvents() {
  const [assignedEvents, setAssignedEvents] = useState<DashboardEvent[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<{ event_id: number; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async (): Promise<DashboardEvent[]> => {
    setLoading(true)
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
    let nextAssigned: DashboardEvent[] = []
    try {
      const [eventsRes, organizerRequestsRes] = await Promise.all([
        fetch(`${API_BASE}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/payments/organizer-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        nextAssigned = (data.assigned as DashboardEvent[]) || []
        setAssignedEvents(nextAssigned)
      } else {
        toast.error("Failed to fetch events")
      }
      if (organizerRequestsRes.ok) {
        const reqData = await organizerRequestsRes.json()
        setOrganizerRequests(reqData.organizer_requests || [])
      }
    } catch (err) {
      console.error("Fetch events error:", err)
      toast.error("An error occurred while fetching events")
    } finally {
      setLoading(false)
    }
    return nextAssigned
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { assignedEvents, organizerRequests, loading, refetch, API_BASE }
}
