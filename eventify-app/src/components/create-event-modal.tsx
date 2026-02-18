"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageIcon } from "lucide-react"

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    eventName: "",
    date: "",
    location: "",
    vendor: "",
    budget: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submitted:", formData)
    // Reset form and close modal
    setFormData({
      eventName: "",
      date: "",
      location: "",
      vendor: "",
      budget: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-12">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>Fill out the form to create a new live project in your eventify ecosystem.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-12">
          {/* Left Column - Form */}
          <div>
            <h1 className="text-4xl font-bold text-purple-600 mb-8">Create Your Event</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="eventName" className="text-sm font-normal text-gray-700">
                  Event Name
                </Label>
                <Input
                  id="eventName"
                  placeholder="e.g., Summer Tech Conference"
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-normal text-gray-700">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-normal text-gray-700">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., 123 Innovation Drive, Techville"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              {/* Google Map Placeholder */}
              <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Google Map Placeholder</p>
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <Label htmlFor="vendor" className="text-sm font-normal text-gray-700">
                  Vendor
                </Label>
                <Select value={formData.vendor} onValueChange={(value) => setFormData({ ...formData, vendor: value })}>
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elegant-catering">Elegant Catering</SelectItem>
                    <SelectItem value="dj-beats">DJ Beats Unlimited</SelectItem>
                    <SelectItem value="floral-designs">Floral Designs by Lily</SelectItem>
                    <SelectItem value="photography-ethan">Photography by Ethan</SelectItem>
                    <SelectItem value="grand-venue">The Grand Venue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm font-normal text-gray-700">
                  Budget ($)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 text-base rounded-full"
                >
                  Create Event
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - Preview */}
          <div>
            <h2 className="text-2xl font-bold text-purple-600 mb-6">Preview</h2>

            <div className="bg-purple-50 rounded-2xl p-8 space-y-6">
              {/* Image Placeholder */}
              <div className="bg-purple-100 rounded-xl h-32 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-purple-400" />
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">{formData.eventName || "Event Name"}</h3>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-semibold text-purple-600">Date:</span>{" "}
                    <span className="text-gray-600">{formData.date || "--/--/----"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-purple-600">Location:</span>{" "}
                    <span className="text-gray-600">{formData.location || "Not Set"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-purple-600">Vendor:</span>{" "}
                    <span className="text-gray-600">{formData.vendor || "Not Selected"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-purple-600">Budget:</span>{" "}
                    <span className="text-gray-600">${formData.budget || "0"}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8">Share</Button>
                <Button className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8">Save Draft</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
