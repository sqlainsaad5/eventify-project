"use client"

import { useState, useEffect } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Package,
  DollarSign,
  Tag,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

// Matches the backend Service model fields exactly
interface ServiceForm {
  name: string
  category: string
  eventType: string
  basePrice: number
  description: string
  location: string
  packages: { packageName: string; price: number; duration: string; features: string[] }[]
}

const emptyForm: ServiceForm = {
  name: "",
  category: "",
  eventType: "",
  basePrice: 0,
  description: "",
  location: "",
  packages: [{ packageName: "", price: 0, duration: "", features: [] }],
}

export default function VendorServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [vendorId, setVendorId] = useState<number | null>(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}")
    setVendorId(u?.id || null)
  }, [])

  useEffect(() => {
    if (vendorId) fetchServices()
  }, [vendorId])

  // GET /api/vendor/services?vendor_id=X (no JWT required)
  const fetchServices = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/vendor/services?vendor_id=${vendorId}`)
      if (res.ok) {
        const d = await res.json()
        setServices(Array.isArray(d) ? d : [])
      } else {
        toast.error("Failed to load services")
      }
    } catch {
      toast.error("Network error loading services")
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (service: any) => {
    setEditingId(service.id)
    setForm({
      name: service.name || "",
      category: service.category || "",
      eventType: service.eventType || "",
      basePrice: service.basePrice || 0,
      description: service.description || "",
      location: service.location || "",
      packages: service.packages?.length
        ? service.packages.map((p: any) => ({
          packageName: p.packageName || "",
          price: p.price || 0,
          duration: p.duration || "",
          features: p.features || [],
        }))
        : [{ packageName: "", price: 0, duration: "", features: [] }],
    })
    setDialogOpen(true)
  }

  // POST /api/vendor/services — requires vendor_id in body
  // PUT /api/vendor/services/<id>
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return }
    if (!form.category.trim()) { toast.error("Category is required"); return }
    if (!form.eventType.trim()) { toast.error("Event type is required"); return }
    if (!form.basePrice || form.basePrice <= 0) { toast.error("Base price must be greater than 0"); return }

    setSaving(true)
    try {
      const payload = editingId
        ? { ...form }
        : { ...form, vendor_id: vendorId }

      const url = editingId
        ? `http://localhost:5000/api/vendor/services/${editingId}`
        : "http://localhost:5000/api/vendor/services"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(editingId ? "Service updated!" : "Service created!")
        setDialogOpen(false)
        fetchServices()
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to save service")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  // PATCH /api/vendor/services/<id>/toggle
  const handleToggle = async (id: number) => {
    setTogglingId(id)
    try {
      const res = await fetch(`http://localhost:5000/api/vendor/services/${id}/toggle`, {
        method: "PATCH",
      })
      if (res.ok) {
        const d = await res.json()
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: d.isActive } : s))
        )
        toast.success("Service status updated")
      } else {
        toast.error("Failed to toggle service")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setTogglingId(null)
    }
  }

  // DELETE /api/vendor/services/<id>
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`http://localhost:5000/api/vendor/services/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id))
        toast.success("Service deleted")
      } else {
        toast.error("Failed to delete service")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setDeletingId(null)
    }
  }

  const updatePackage = (index: number, field: string, value: string | number) => {
    setForm((prev) => {
      const packages = [...prev.packages]
      packages[index] = { ...packages[index], [field]: value }
      return { ...prev, packages }
    })
  }

  const addPackage = () => {
    setForm((prev) => ({
      ...prev,
      packages: [...prev.packages, { packageName: "", price: 0, duration: "", features: [] }],
    }))
  }

  const removePackage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading your services...</p>
          </div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Services</h1>
            <p className="text-slate-500 mt-1">
              Manage the services and packages you offer to event organizers.
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-100 rounded-xl self-start md:self-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Services Grid */}
        {services.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.id}
                className={`group border-slate-200/60 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden ${!service.isActive ? "opacity-60" : ""
                  }`}
              >
                <div
                  className={`h-1.5 ${service.isActive
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                      : "bg-slate-200"
                    }`}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-50 group-hover:bg-purple-100 transition-colors">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {service.name}
                      </CardTitle>
                    </div>
                    <Badge
                      className={`border-none text-[10px] font-bold uppercase shrink-0 ${service.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                        }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {service.description && (
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {service.category && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {service.category} · {service.eventType}
                      </p>
                    )}
                    {service.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {service.location}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Base Price: ${service.basePrice?.toLocaleString()}
                    </p>
                  </div>

                  {/* Packages */}
                  {service.packages?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Packages ({service.packages.length})
                      </p>
                      <div className="space-y-1.5">
                        {service.packages.map((pkg: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2"
                          >
                            <span className="text-xs font-medium text-slate-700">{pkg.packageName}</span>
                            <span className="text-xs font-bold text-purple-600 flex items-center">
                              <DollarSign className="h-3 w-3" />
                              {pkg.price?.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(service)}
                      className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(service.id)}
                      disabled={togglingId === service.id}
                      className={`flex-1 rounded-xl text-xs ${service.isActive
                          ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                          : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                    >
                      {togglingId === service.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : service.isActive ? (
                        <ToggleRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ToggleLeft className="h-3 w-3 mr-1" />
                      )}
                      {service.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      disabled={deletingId === service.id}
                      className="rounded-xl border-red-100 text-red-500 hover:bg-red-50 text-xs px-3"
                    >
                      {deletingId === service.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-purple-300" />
            </div>
            <p className="text-slate-600 font-semibold text-lg">No services yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Add your first service to start getting booked by organizers.
            </p>
            <Button
              onClick={openAdd}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg shadow-purple-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {editingId ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingId
                ? "Update your service details and packages."
                : "Fill in the details for your new service offering."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Service Name *</Label>
              <Input
                placeholder="e.g. Wedding Photography"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Category + Event Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Category *</Label>
                <Input
                  placeholder="e.g. Photography"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Event Type *</Label>
                <Input
                  placeholder="e.g. Wedding, Corporate"
                  value={form.eventType}
                  onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Base Price + Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Base Price ($) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.basePrice || ""}
                    onChange={(e) => setForm((p) => ({ ...p, basePrice: parseFloat(e.target.value) || 0 }))}
                    className="pl-9 rounded-xl border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Location</Label>
                <Input
                  placeholder="e.g. New York, NY"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Describe what this service includes..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="rounded-xl border-slate-200 resize-none"
                rows={3}
              />
            </div>

            {/* Packages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Packages</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addPackage}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Package
                </Button>
              </div>

              <div className="space-y-3">
                {form.packages.map((pkg, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Package {i + 1}
                      </span>
                      {form.packages.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => removePackage(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Package name (e.g. Basic, Premium)"
                      value={pkg.packageName}
                      onChange={(e) => updatePackage(i, "packageName", e.target.value)}
                      className="rounded-lg border-slate-200 bg-white text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={pkg.price || ""}
                          onChange={(e) => updatePackage(i, "price", parseFloat(e.target.value) || 0)}
                          className="pl-9 rounded-lg border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <Input
                        placeholder="Duration (e.g. 4 hours)"
                        value={pkg.duration}
                        onChange={(e) => updatePackage(i, "duration", e.target.value)}
                        className="rounded-lg border-slate-200 bg-white text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Save Changes" : "Create Service"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  )
}