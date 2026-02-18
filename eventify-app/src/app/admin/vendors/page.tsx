"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const vendors = [
  { id: 1, name: "Royal Caterers", category: "Catering", verified: true },
  { id: 2, name: "EventDecor", category: "Decoration", verified: false },
  { id: 3, name: "StagePro", category: "Entertainment", verified: true },
]

export default function VendorsPage() {
  return (
    <AdminLayout>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3">Vendor Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Verified</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{vendor.name}</td>
                  <td className="p-3">{vendor.category}</td>
                  <td className="p-3">
                    <Switch checked={vendor.verified} />
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
