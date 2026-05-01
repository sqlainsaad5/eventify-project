"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface Notification {
    id: number
    title: string
    message: string
    type: string
    is_read: boolean
    created_at: string
    extra_data?: any
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const fetchNotifications = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token")?.replace(/['"]+/g, "").trim() : null
        if (!token) return

        try {
            const res = await fetch("http://localhost:5000/api/payments/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.status === 401) {
                // Session is no longer valid; clear auth so we stop polling with a bad token
                localStorage.removeItem("token")
                localStorage.removeItem("user")
                localStorage.removeItem("role")
                document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
                document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
                return
            }
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications || [])
            }
        } catch (err) {
            console.error("Notification sync error:", err)
        }
    }, [])

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 15000) // Poll every 15s
        const onRefresh = () => fetchNotifications()
        window.addEventListener("refresh-notifications", onRefresh)
        return () => {
            clearInterval(interval)
            window.removeEventListener("refresh-notifications", onRefresh)
        }
    }, [fetchNotifications])

    const markAsRead = async (n: Notification) => {
        const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        const role = localStorage.getItem("role")
        if (!token) return

        try {
            if (!n.is_read) {
                await fetch(`http://localhost:5000/api/payments/notifications/${n.id}/read`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` }
                })
                // Local update
                setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif))
            }

            // Role-based redirection logic
            if (n.type === "chat") {
                const senderId = n.extra_data?.sender_id
                if (role === "vendor") {
                    router.push(`/vendor/messages${senderId ? `?organizerId=${senderId}` : ""}`)
                } else if (role === "organizer") {
                    router.push(`/dashboard/vendors${senderId ? `?vendorId=${senderId}` : ""}`)
                } else {
                    router.push(`/my-events/messages${senderId ? `?organizerId=${senderId}` : ""}`)
                }
            } else if (n.type === "service_update" && role === "organizer") {
                const vendorId = n.extra_data?.vendor_id
                router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}&openServices=true` : ""}`)
            } else if (n.extra_data?.type === "booking" && role === "vendor") {
                router.push("/vendor/bookings")
            } else if (role === "user" && (n.type === "payment" || n.extra_data?.organizer_request_id)) {
                router.push("/my-events/payments")
            } else if (n.extra_data?.action === "open_events" && role === "organizer") {
                router.push("/dashboard/open-events")
            } else if ((n.extra_data?.action === "organizer_payment_followup" || n.extra_data?.category === "organizer_fee") && role === "organizer") {
                router.push("/dashboard/payments?tab=organizer")
            } else if (n.extra_data?.action === "vendor_payout_request" && role === "organizer") {
                router.push("/dashboard/payments?tab=requests")
            } else if (n.extra_data?.action === "vendor_work_verification" && role === "organizer") {
                const vendorId = n.extra_data?.vendor_id
                router.push(`/dashboard/vendors${vendorId ? `?vendorId=${vendorId}` : ""}`)
            } else if (role === "user" && n.extra_data?.action === "view_applications" && n.extra_data?.event_id) {
                router.push(`/my-events?applications=${n.extra_data.event_id}`)
            } else if (n.extra_data?.event_id) {
                if (role === "user") {
                    router.push("/my-events")
                } else if (role === "organizer") {
                    router.push("/dashboard/events")
                } else if (role === "vendor") {
                    router.push("/vendor/bookings")
                }
            }
        } catch (err) {
            console.error("Fail to mark read", err)
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
                toast({ title: "Notifications cleared" })
            }
        } catch (err) {
            console.error("Failed to clear notifications")
        }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const isOrganizerFeeNotification = (n: Notification) =>
        n.extra_data?.action === "organizer_payment_followup" || n.extra_data?.category === "organizer_fee"

    const byDateDesc = (a: Notification, b: Notification) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

    const organizerFeeNotifications = notifications.filter(isOrganizerFeeNotification).sort(byDateDesc)
    const otherNotifications = notifications.filter(n => !isOrganizerFeeNotification(n)).sort(byDateDesc)
    const orderedForDisplay = [...organizerFeeNotifications, ...otherNotifications].slice(0, 15)

    const renderNotificationItem = (n: Notification) => (
        <DropdownMenuItem
            key={n.id}
            onClick={() => markAsRead(n)}
            className={cn(
                "flex flex-col items-start gap-1 p-3 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent",
                !n.is_read ? "bg-indigo-50/40 border-indigo-50 hover:bg-indigo-50" : "opacity-70 hover:bg-slate-50"
            )}
        >
            <div className="flex items-center justify-between w-full">
                <span className={cn("text-xs tracking-tight", !n.is_read ? "font-black text-indigo-900" : "font-bold text-slate-700")}>
                    {n.title}
                </span>
                {!n.is_read && <div className="w-2 h-2 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />}
            </div>
            <p className="text-[11px] text-slate-500 leading-snug font-medium line-clamp-2">
                {n.message}
            </p>
            <div className="flex items-center gap-2 mt-1.5 w-full justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {isOrganizerFeeNotification(n) && (
                    <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">Organizer Fee</span>
                )}
                {n.type === "chat" && !isOrganizerFeeNotification(n) && (
                    <span className="text-[9px] bg-white border border-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md font-black uppercase">Message</span>
                )}
                {n.extra_data?.type === "booking" && !isOrganizerFeeNotification(n) && (
                    <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">Booking</span>
                )}
                {n.type === "payment" && !isOrganizerFeeNotification(n) && (
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">Payment</span>
                )}
            </div>
        </DropdownMenuItem>
    )

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 rounded-xl transition-all active:scale-95">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center bg-indigo-600 border-2 border-white text-white text-[9px] font-black rounded-full animate-in zoom-in duration-300">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] rounded-[24px] p-2 shadow-2xl border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-50 mb-2">
                    <DropdownMenuLabel className="font-black text-slate-900 text-sm tracking-tight p-0">
                        Notifications
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <div className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {unreadCount} NEW
                        </div>
                    )}
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-1 scrollbar-hide">
                    {notifications.length > 0 ? (
                        (() => {
                            let prevGroup: "fee" | "other" | null = null
                            return orderedForDisplay.map((n) => {
                                const group: "fee" | "other" = isOrganizerFeeNotification(n) ? "fee" : "other"
                                const showFeeHeader = group === "fee" && prevGroup !== "fee"
                                const showOtherHeader = group === "other" && prevGroup === "fee"
                                prevGroup = group
                                return (
                                    <Fragment key={n.id}>
                                        {showFeeHeader && (
                                            <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-violet-600">
                                                Organizer Fee
                                            </p>
                                        )}
                                        {showOtherHeader && organizerFeeNotifications.length > 0 && (
                                            <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Other
                                            </p>
                                        )}
                                        {renderNotificationItem(n)}
                                    </Fragment>
                                )
                            })
                        })()
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                                <Bell className="h-6 w-6 text-slate-200" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting updates...</p>
                            <p className="text-[10px] text-slate-300 mt-1 font-medium">Your notifications will appear here.</p>
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator className="my-2 bg-slate-50" />
                        <div className="flex items-center gap-2 p-1">
                            <Button
                                variant="ghost"
                                onClick={clearAllNotifications}
                                className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                                Clear All
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
