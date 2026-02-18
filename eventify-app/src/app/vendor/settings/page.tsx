"use client"

import { useState } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function VendorSettingsPage() {
  const [vendorData, setVendorData] = useState({
    name: "Saad Amjad",
    email: "saadvendor@example.com",
    phone: "+92 300 1234567",
    company: "Bin Maqsood Pvt Ltd",
    serviceType: "Event Decoration",
    description:
      "We provide premium decoration and event setup services including stage, lighting, and floral designs.",
    available: true,
  })

  const handleChange = (key: string, value: string | boolean) => {
    setVendorData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Updated Vendor Profile:", vendorData)
    alert("Profile updated successfully!")
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Update your business profile, contact information, and service details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Saad" />
                  <AvatarFallback>SA</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={vendorData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={vendorData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={vendorData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={vendorData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="serviceType">Service Type</Label>
                <Input
                  id="serviceType"
                  value={vendorData.serviceType}
                  onChange={(e) => handleChange("serviceType", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={vendorData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Currently Accepting Bookings</p>
                <p className="text-sm text-muted-foreground">
                  Toggle this switch if you're open for new event requests
                </p>
              </div>
              <Switch
                checked={vendorData.available}
                onCheckedChange={(val) => handleChange("available", val)}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </VendorLayout>
  )
}
