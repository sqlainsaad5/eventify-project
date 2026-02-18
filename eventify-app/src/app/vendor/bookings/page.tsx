"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, XCircle, MessageSquare, DollarSign, Loader2, Bell, Send, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast" // ✅ ADD MISSING IMPORT


interface Booking {
  id: number
  eventName: string
  date: string
  client: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  budget: string
}

interface AssignedEvent {
  id: number
  name: string
  date: string
  venue: string
  budget: string | number
  status: "assigned" | "in_progress" | "completed"
  organizer_id: number
}

interface PaymentRequest {
  id: number
  event_id: number
  vendor_id: number
  amount: number
  status: "pending" | "approved" | "rejected" | "paid"
  description: string
  created_at: string
}

interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

interface ChatMessage {
  id: number
  sender_id: number
  sender_name: string
  receiver_id: number
  receiver_name: string
  event_id: number
  event_name: string
  message: string
  is_read: boolean
  created_at: string
  timestamp: string
}

interface Conversation {
  event_id: number
  event_name: string
  organizer_id: number
  organizer_name: string
  organizer_email: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [assignLoading, setAssignLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const activeEvents = assignedEvents.filter(event => event.status !== "completed");
  const completedEvents = assignedEvents.filter(event => event.status === "completed");

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // ✅ Chat State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatDialogOpen, setChatDialogOpen] = useState(false)

  const { toast } = useToast() // ✅ INITIALIZE TOAST

  // ✅ Unique ID generator to fix duplicate key issues
  const generateUniqueId = (): number => {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
  // Debounce hook for performance
  const useDebounce = (value: any, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  // ✅ Get vendorId from user data in localStorage
  const getVendorId = (): number | null => {
    if (typeof window === "undefined") return null
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        return user.id || user._id
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }
    return null
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("token")?.replace(/['"]+/g, "").trim() : null
  const vendorId = getVendorId()

  // ✅ Load notifications with better error handling
  const loadNotifications = async () => {
    if (!vendorId) return

    try {
      const res = await fetch(`http://localhost:5000/api/payments/vendor/${vendorId}/notifications`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })

      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.is_read).length || 0)
      } else {
        // Fallback to general notifications endpoint
        const fallbackRes = await fetch("http://localhost:5000/api/payments/notifications", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        })

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          const vendorNotifications = fallbackData.notifications?.filter((n: Notification) => n.user_id === vendorId) || []
          setNotifications(vendorNotifications)
          setUnreadCount(vendorNotifications.filter((n: Notification) => !n.is_read).length)
        }
      }
    } catch (err) {
      console.error("Error loading notifications:", err)
    }
  }

  // ✅ Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      await fetch(`http://localhost:5000/api/payments/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  // ✅ Fetch assigned events with better error handling
  const fetchAssignedEvents = async () => {
    if (!vendorId) {
      console.warn("vendorId missing in localStorage")
      setAssignedEvents([])
      setAssignLoading(false)
      return
    }

    setAssignLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/vendors/assigned_events/${vendorId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      })

      if (res.ok) {
        const data = await res.json()
        console.log("✅ Assigned events data:", data)

        if (data.assigned_events && Array.isArray(data.assigned_events)) {
          const events = data.assigned_events.map((e: any) => ({
            id: e.id || 0,
            name: e.name || "Unnamed Event",
            date: e.date || new Date().toISOString(),
            venue: e.venue || "N/A",
            budget: e.budget || "$0",
            status: e.status || "assigned",
            organizer_id: e.organizer_id || 0
          }))
          setAssignedEvents(events)
        } else {
          setAssignedEvents([])
        }
      } else {
        console.error("Failed to fetch assigned events:", res.status)
        setAssignedEvents([])
      }
    } catch (err) {
      console.error("Error fetching assigned events:", err)
      setAssignedEvents([])
    } finally {
      setAssignLoading(false)
    }
  }

  // ✅ Fetch vendor's bookings
  const fetchBookings = async () => {
    if (!vendorId) {
      setBookings([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/vendors/${vendorId}/bookings`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      })

      if (res.ok) {
        const data = await res.json()
        setBookings(Array.isArray(data) ? data : [])
      } else {
        setBookings([])
      }
    } catch (err) {
      console.error("Error fetching bookings:", err)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  // ✅ Fetch payment requests with better state management
  const fetchPaymentRequests = async () => {
    if (!vendorId) return

    try {
      const res = await fetch(`http://localhost:5000/api/payments/vendor/${vendorId}/requests`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      })

      if (res.ok) {
        const data = await res.json()
        const newRequests = data.requests || []

        setPaymentRequests(prevRequests => {
          const paidNotifications = newRequests.filter((newReq: PaymentRequest) =>
            newReq.status === "paid" &&
            !prevRequests.find(prevReq => prevReq.id === newReq.id && prevReq.status === "paid")
          )

          paidNotifications.forEach((request: PaymentRequest) => {
            const newNotification: Notification = {
              id: generateUniqueId(),
              user_id: vendorId!,
              title: "💰 Payment Received!",
              message: `Your payment of $${request.amount} has been processed and transferred to your account.`,
              type: "success",
              is_read: false,
              created_at: new Date().toISOString()
            }
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
          })

          return newRequests
        })
      }
    } catch (err) {
      console.error("Error fetching payment requests:", err)
    }
  }

  // ✅ CHAT FUNCTIONS - FIXED

  // Fetch vendor's conversations
  const fetchConversations = async () => {
    if (!vendorId || !token) return

    try {
      const res = await fetch("http://localhost:5000/api/chat/vendor/conversations", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      } else {
        console.error("Failed to fetch conversations")
      }
    } catch (err) {
      console.error("Error fetching conversations:", err)
    }
  }
  // ✅ Open chat for booking - NEW FUNCTION
  const openChatForBooking = async (booking: Booking) => {
    try {
      // First, find the assigned event for this booking
      const assignedEvent = assignedEvents.find(event =>
        event.name === booking.eventName || event.id === booking.id
      );

      if (assignedEvent) {
        // If event is assigned, use existing chat function
        await openChat(assignedEvent);
      } else {
        // If no assigned event found, create a new conversation
        console.log(`💬 Opening chat for booking: ${booking.eventName}`);

        // Reset chat state for new conversation
        setChatMessages([]);
        setNewMessage("");

        // Create a temporary conversation for booking
        const bookingConversation: Conversation = {
          event_id: booking.id, // Use booking ID as event_id
          event_name: booking.eventName,
          organizer_id: 0, // We'll need to fetch this
          organizer_name: booking.client || "Organizer",
          organizer_email: "",
          last_message: "",
          last_message_time: "",
          unread_count: 0
        };

        setSelectedConversation(bookingConversation);
        setChatDialogOpen(true);

        // Try to fetch messages for this booking
        try {
          await fetchChatMessages(booking.id);
        } catch (err) {
          console.log("No existing messages for this booking");
          // Start fresh conversation
          setChatMessages([]);
        }

        toast({
          title: "Chat Started",
          description: `You can now chat about "${booking.eventName}"`,
        });
      }
    } catch (err) {
      console.error("Error opening chat for booking:", err);
      toast({
        title: "Failed to open chat",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Fetch messages for a specific event - FIXED
  const fetchChatMessages = async (eventId: number) => {
    if (!vendorId || !token) return

    setChatLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/chat/event/${eventId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages(data.messages || [])

        // Mark messages as read
        await fetch("http://localhost:5000/api/chat/mark-read", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ event_id: eventId })
        })

        // Refresh conversations to update unread count
        fetchConversations()
      } else {
        console.error("Failed to fetch messages")
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err)
    } finally {
      setChatLoading(false)
    }
  }

  // Send message to organizer - FIXED
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !vendorId || !token) return

    try {
      const res = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: selectedConversation.event_id,
          receiver_id: selectedConversation.organizer_id,
          message: newMessage.trim()
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages(prev => [...prev, data.chat_message])
        setNewMessage("")

        // Refresh conversations to update last message
        fetchConversations()

        toast({
          title: "Message Sent",
          description: "Your message has been sent to the organizer",
        })
      } else {
        const errorData = await res.json()
        toast({
          title: "Failed to send message",
          description: errorData.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error sending message:", err)
      toast({
        title: "Failed to send message",
        description: "Network error. Please check your connection.",
        variant: "destructive",
      })
    }
  }

  // Open chat for a specific event - FIXED
  const openChat = async (event: AssignedEvent) => {
    // Find existing conversation or create new one
    const existingConversation = conversations.find(
      conv => conv.event_id === event.id
    )

    if (existingConversation) {
      setSelectedConversation(existingConversation)
    } else {
      // We need to fetch organizer details
      try {
        const res = await fetch(`http://localhost:5000/api/events/${event.id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const eventData = await res.json()
          const newConversation: Conversation = {
            event_id: event.id,
            event_name: event.name,
            organizer_id: eventData.user_id || event.organizer_id,
            organizer_name: "Organizer",
            organizer_email: "",
            last_message: "",
            last_message_time: "",
            unread_count: 0
          }
          setSelectedConversation(newConversation)
        }
      } catch (err) {
        console.error("Error fetching event details:", err)
        // Fallback conversation
        const fallbackConversation: Conversation = {
          event_id: event.id,
          event_name: event.name,
          organizer_id: event.organizer_id,
          organizer_name: "Organizer",
          organizer_email: "",
          last_message: "",
          last_message_time: "",
          unread_count: 0
        }
        setSelectedConversation(fallbackConversation)
      }
    }

    setChatDialogOpen(true)
    await fetchChatMessages(event.id)
  }

  // ✅ Mark event as completed with better state management
  const handleMarkAsDone = async (eventId: number) => {
    if (!confirm("Mark this event as completed? You can then request payment.")) return

    setProcessing(eventId)
    try {
      console.log("🔄 Marking event as done:", eventId);

      const res = await fetch(`http://localhost:5000/api/vendors/events/${eventId}/complete`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      });

      console.log("📨 Mark as Done Response status:", res.status);

      if (res.ok) {
        const result = await res.json();
        console.log("✅ Backend response:", result);

        setAssignedEvents(prev => prev.map(event =>
          event.id === eventId ? { ...event, status: "completed" } : event
        ));

        const event = assignedEvents.find(e => e.id === eventId);
        const newNotification: Notification = {
          id: generateUniqueId(),
          user_id: vendorId!,
          title: "✅ Event Completed!",
          message: `You marked "${event?.name || 'Event'}" as completed. You can now request payment.`,
          type: "success",
          is_read: false,
          created_at: new Date().toISOString()
        }
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)

        toast({
          title: "Event Completed!",
          description: "Event marked as completed. You can now request payment.",
        })

      } else {
        const errorData = await res.json();
        console.error("❌ Backend error:", errorData);
        toast({
          title: "Failed to mark event as completed",
          description: errorData.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error marking event as done:", err)
      toast({
        title: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  // ✅ Request payment with better error handling
  const handleRequestPayment = async (eventId: number, amount: number) => {
    if (!confirm(`Request payment of $${amount} for this event?`)) return

    setProcessing(eventId)
    try {
      const requestBody = {
        event_id: eventId,
        vendor_id: vendorId,
        amount: amount,
        description: `Payment for services rendered for event ${eventId}`
      };

      const res = await fetch("http://localhost:5000/api/payments/request", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const result = await res.json();

      if (res.ok) {
        const newNotification: Notification = {
          id: generateUniqueId(),
          user_id: vendorId!,
          title: "📤 Payment Request Sent",
          message: `Your payment request for $${amount} has been submitted and is pending approval.`,
          type: "info",
          is_read: false,
          created_at: new Date().toISOString()
        }
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)

        toast({
          title: "Payment Request Sent",
          description: "Your payment request has been submitted successfully!",
        })
        fetchPaymentRequests()
      } else {
        console.error("❌ Backend error:", result);
        toast({
          title: "Failed to submit payment request",
          description: result.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("❌ Network error:", err)
      toast({
        title: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  // ✅ Calculate payment amount (75% of budget)
  const calculatePaymentAmount = (budget: string | number) => {
    const budgetNum = typeof budget === 'string' ?
      parseFloat(budget.replace(/[^0-9.-]+/g, "")) : budget
    return Math.floor(budgetNum * 0.75)
  }

  // ✅ useEffect with cleanup and dependency optimization
  useEffect(() => {
    console.log("Vendor ID:", vendorId)
    console.log("Token:", token ? "Present" : "Missing")

    if (vendorId) {
      fetchAssignedEvents()
      fetchBookings()
      fetchPaymentRequests()
      loadNotifications()
      fetchConversations()
    }

    const interval = setInterval(() => {
      if (vendorId) {
        loadNotifications()
        fetchPaymentRequests()
        fetchConversations()

        // Refresh chat messages if chat is open
        if (selectedConversation) {
          fetchChatMessages(selectedConversation.event_id)
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [vendorId, token, selectedConversation])

  const handleStatusChange = (id: number, status: Booking["status"]) => {
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    )
  }

  // ✅ Loading state with better UX
  if (loading || assignLoading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading vendor dashboard...</p>
          </div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your assigned events and payment requests
          </p>
        </div>

        {/* Notifications Section */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </h2>
            <Button onClick={loadNotifications} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {notifications.length === 0 ? (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="py-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400">
                  You'll get notifications for payments, event updates, and messages
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-l-4 ${notification.type === 'success' ? 'border-l-green-500' :
                    notification.type === 'error' ? 'border-l-red-500' :
                      'border-l-blue-500'
                    } ${!notification.is_read ? 'bg-blue-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="outline"
                          size="sm"
                          className="ml-2"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Payment Requests Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Requests ({paymentRequests.length})
          </h2>
          {paymentRequests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Payment Request #{request.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Event ID: {request.event_id}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Amount:</span>
                      <span className="text-green-600 font-semibold">
                        ${request.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={
                        request.status === "paid" ? "default" :
                          request.status === "approved" ? "secondary" :
                            request.status === "pending" ? "outline" : "destructive"
                      }>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Requested: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="py-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment requests yet</p>
                <p className="text-sm text-gray-400">Complete events to request payments</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ACTIVE EVENTS SECTION */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Active Events ({activeEvents.length})
          </h2>
          {activeEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeEvents.map((event) => (
                <Card key={event.id} className="mb-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      {event.name}
                      <Badge variant={
                        event.status === "in_progress" ? "secondary" : "outline"
                      }>
                        {event.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p><strong>Venue:</strong> {event.venue}</p>
                    <p><strong>Budget:</strong> ${event.budget}</p>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleMarkAsDone(event.id)}
                        disabled={processing === event.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processing === event.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Mark as Done
                      </Button>
                      {/* <Button
                        onClick={() => openChat(event)}
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active events</p>
                <p className="text-sm text-gray-400">New events assigned to you will appear here</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* COMPLETED EVENTS SECTION */}
        {completedEvents.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              ✅ Completed Events ({completedEvents.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedEvents.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      {event.name}
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        Completed
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p><strong>Venue:</strong> {event.venue}</p>
                    <p><strong>Budget:</strong> ${event.budget}</p>
                    <p><strong>Payment Amount:</strong> <span className="text-green-600 font-semibold">${calculatePaymentAmount(event.budget)}</span></p>

                    <Button
                      onClick={() => handleRequestPayment(event.id, calculatePaymentAmount(event.budget))}
                      disabled={processing === event.id}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {processing === event.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Request Payment
                    </Button>

                    <p className="text-xs text-green-600 text-center">
                      ✅ Ready for payment request
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Bookings Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Bookings ({bookings.length})</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{booking.eventName}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {new Date(booking.date).toLocaleDateString()}
                    </p>
                  </CardHeader> {/* ✅ FIXED: Changed </CardContent> to </CardHeader> */}
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <p>
                        <span className="font-medium">Client:</span> {booking.client || "Organizer"}
                      </p>
                      <p>
                        <span className="font-medium">Budget:</span> {booking.budget}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge
                        className={
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : booking.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                        }
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>

                      <div className="flex gap-2">
                        {booking.status !== "confirmed" && booking.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(booking.id, "confirmed")}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                          </Button>
                        )}
                        {booking.status !== "cancelled" && booking.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(booking.id, "cancelled")}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* <Button
                      variant="secondary"
                      className="w-full mt-2 flex items-center justify-center bg-purple-100 text-purple-700 hover:bg-purple-200"
                      onClick={() => openChatForBooking(booking)} // ✅ ADD THIS ONCLICK
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Organizer
                    </Button> */}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-gray-50 border-dashed col-span-full">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No bookings available</p>
                  <p className="text-sm text-gray-400">Your bookings will appear here when assigned</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Chat - {selectedConversation?.event_name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Chat with organizer about {selectedConversation?.event_name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg">
            {chatLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin w-6 h-6" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === vendorId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender_id === vendorId
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                      }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === vendorId ? 'text-purple-200' : 'text-gray-500'
                      }`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  )
}