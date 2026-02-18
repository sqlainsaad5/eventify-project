"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, CalendarDays, CheckCircle2 } from "lucide-react"

const notifications = [
  { id: 1, title: "Vendor Approved", desc: "Elite Catering Services has accepted your booking.", time: "2h ago" },
  { id: 2, title: "New Event Reminder", desc: "Corporate Meetup scheduled for Dec 5, 2024.", time: "1 day ago" },
  { id: 3, title: "Budget Alert", desc: "You’ve used 85% of the catering budget for Tech Expo.", time: "2 days ago" },
]

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
          <Bell className="h-6 w-6 text-purple-600" /> Notifications & Calendar
        </h1>
        <p className="text-gray-500">View recent updates, reminders, and upcoming schedules</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card>
            <CardHeader><CardTitle>Recent Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 border-b border-gray-200">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-600">{n.desc}</p>
                  <p className="text-xs text-gray-400">{n.time}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Calendar (Placeholder) */}
          <Card className="p-6 flex flex-col items-center justify-center text-center">
            <CalendarDays className="h-12 w-12 text-purple-600 mb-3" />
            <h3 className="text-xl font-bold">Calendar Integration</h3>
            <p className="text-gray-500">Google Calendar integration coming soon!</p>
            <CheckCircle2 className="text-green-500 h-5 w-5 mt-3" />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
