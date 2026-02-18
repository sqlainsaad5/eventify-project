"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const analyticsData = [
  { month: "Jan", events: 45, users: 200 },
  { month: "Feb", events: 65, users: 300 },
  { month: "Mar", events: 85, users: 420 },
  { month: "Apr", events: 110, users: 500 },
]

export default function AnalyticsPage() {
  return (
    <AdminLayout>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="users" fill="#8b5cf6" name="Users" />
                <Bar dataKey="events" fill="#a855f7" name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
