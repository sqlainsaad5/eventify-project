"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Payment, Event, PaymentRequest, OrganizerPaymentRequest, AppNotification } from "./payment-workflow-types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function usePaymentWorkflowData() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [organizerRequests, setOrganizerRequests] = useState<OrganizerPaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const getToken = useCallback(
    () => localStorage.getItem("token")?.replace(/['"]+/g, "").trim(),
    []
  )

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) {
      return router.push("/login")
    }
    try {
      setLoading(true)
      const [eventsRes, paymentsRes, requestsRes, orgRequestsRes, notificationsRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments/events-with-payment-status`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/payments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/payments/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/payments/organizer-requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/payments/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (eventsRes.ok) setEvents(await eventsRes.json())
      if (paymentsRes.ok) {
        const d = await paymentsRes.json()
        setPayments(d.payments || [])
      }
      if (requestsRes.ok) {
        const d = await requestsRes.json()
        setPaymentRequests(d.requests || [])
      }
      if (orgRequestsRes.ok) {
        const d = await orgRequestsRes.json()
        setOrganizerRequests(d.organizer_requests || [])
      }
      if (notificationsRes.ok) {
        const d = await notificationsRes.json()
        setNotifications(d.notifications || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [getToken, router])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    API_BASE,
    getToken,
    loadData,
    loading,
    payments,
    events,
    setEvents,
    paymentRequests,
    organizerRequests,
    notifications,
    setOrganizerRequests,
  }
}
