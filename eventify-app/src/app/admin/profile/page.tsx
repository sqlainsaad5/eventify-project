"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function AdminProfilePage() {
  return (
    <AdminLayout>
      <Card className="bg-white max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Admin Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-700">Full Name</label>
            <Input placeholder="Admin Name" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <Input placeholder="admin@example.com" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Password</label>
            <Input type="password" placeholder="********" />
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
