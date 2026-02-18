"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const organizers = [
  { id: 1, name: "Ali Khan", email: "ali@example.com", events: 5 },
  { id: 2, name: "Sara Ahmed", email: "sara@example.com", events: 3 },
  { id: 3, name: "Bilal Raza", email: "bilal@example.com", events: 7 },
]

export default function OrganizersPage() {
  return (
    <AdminLayout>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Organizer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Events</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{o.name}</td>
                  <td className="p-3">{o.email}</td>
                  <td className="p-3">{o.events}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline">
                      Suspend
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
