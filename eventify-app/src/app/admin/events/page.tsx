"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle, XCircle, Eye } from "lucide-react"

interface Event {
  id: number
  title: string
  organizer: string
  vendor: string
  date: string
  budget: string
  status: "Pending" | "Approved" | "Cancelled"
}

export default function AdminEventsPage() {
  const [search, setSearch] = useState("")
  const [events, setEvents] = useState<Event[]>([
    {
      id: 1,
      title: "Tech Innovators Conference",
      organizer: "Saad Amjad",
      vendor: "Bin Maqsood Pvt Ltd",
      date: "2025-11-20",
      budget: "$5000",
      status: "Approved",
    },
    {
      id: 2,
      title: "Corporate Gala Night",
      organizer: "Amna Shah",
      vendor: "Elite Decor",
      date: "2025-12-05",
      budget: "$8500",
      status: "Pending",
    },
    {
      id: 3,
      title: "Wedding Reception",
      organizer: "Usman Khalid",
      vendor: "Star Events",
      date: "2025-12-10",
      budget: "$10000",
      status: "Cancelled",
    },
  ])

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.organizer.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor.toLowerCase().includes(search.toLowerCase())
  )

  const handleStatusChange = (id: number, status: Event["status"]) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Events Management</h1>
          <p className="text-muted-foreground">
            Review, approve, or cancel organizer-submitted events
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by event, organizer, or vendor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Event Title</th>
                  <th className="px-4 py-2 text-left font-medium">Organizer</th>
                  <th className="px-4 py-2 text-left font-medium">Vendor</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Budget</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{event.title}</td>
                      <td className="px-4 py-2 text-gray-600">{event.organizer}</td>
                      <td className="px-4 py-2 text-gray-600">{event.vendor}</td>
                      <td className="px-4 py-2">{event.date}</td>
                      <td className="px-4 py-2">{event.budget}</td>
                      <td className="px-4 py-2">
                        <Badge
                          className={
                            event.status === "Approved"
                              ? "bg-green-100 text-green-700"
                              : event.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          onClick={() => alert("Event details coming soon")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {event.status !== "Approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(event.id, "Approved")}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {event.status !== "Cancelled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(event.id, "Cancelled")}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      No events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
