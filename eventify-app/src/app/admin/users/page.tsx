"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Trash2, Edit, Ban } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  role: "Organizer" | "Vendor"
  status: "Active" | "Blocked"
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: "Saad Amjad", email: "saad@events.com", role: "Organizer", status: "Active" },
    { id: 2, name: "Amna Shah", email: "amna@vendors.com", role: "Vendor", status: "Active" },
    { id: 3, name: "Bin Maqsood Pvt Ltd", email: "info@binmaqsood.com", role: "Vendor", status: "Blocked" },
    { id: 4, name: "Tech Expo Team", email: "techexpo@org.com", role: "Organizer", status: "Active" },
  ])

  const [search, setSearch] = useState("")

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleStatusToggle = (id: number) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? { ...user, status: user.status === "Active" ? "Blocked" : "Active" }
          : user
      )
    )
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers((prev) => prev.filter((user) => user.id !== id))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">View, edit, and manage all organizers and vendors</p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Role</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{user.name}</td>
                      <td className="px-4 py-2 text-gray-600">{user.email}</td>
                      <td className="px-4 py-2">
                        <Badge
                          className={
                            user.role === "Organizer"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={
                            user.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => alert("Edit user coming soon")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(user.id)}
                          className={
                            user.status === "Active"
                              ? "text-red-600 border-red-600 hover:bg-red-50"
                              : "text-green-600 border-green-600 hover:bg-green-50"
                          }
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="text-gray-600 border-gray-400 hover:bg-gray-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500">
                      No users found.
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
