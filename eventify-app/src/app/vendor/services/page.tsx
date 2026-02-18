"use client"

import { useState, useEffect } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, PlusCircle, MapPin, Calendar, Clock } from "lucide-react"

interface ServicePackage {
  packageName: string
  price: number
  duration: string
  features: string[]
}

interface Service {
  id: number
  name: string
  category: string
  eventType: string
  basePrice: number
  description: string
  packages: ServicePackage[]
  availability: string[]
  location: string
  portfolioImages: string[]
  isActive: boolean
  vendor_id: number
}

const API_BASE = "http://localhost:5000";

export default function VendorServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState<Service>({
    id: 0,
    name: "",
    category: "",
    eventType: "",
    basePrice: 0,
    description: "",
    packages: [{ packageName: "", price: 0, duration: "", features: [""] }],
    availability: [""],
    location: "",
    portfolioImages: [""],
    isActive: true,
    vendor_id: 0
  })

  // ✅ Fetch current vendor ID from backend
  // ✅ Fetch current vendor ID from backend - UPDATE THIS FUNCTION
const fetchCurrentVendor = async () => {
  try {
    // Get token from localStorage (ya jahan bhi store kiya hai)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      console.warn("No token found, user might not be logged in");
      return null;
    }

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const vendorData = await response.json();
      console.log("📋 Vendor data received:", vendorData);
      
      if (vendorData && vendorData.id) {
        setVendorId(vendorData.id);
        return vendorData.id;
      } else {
        console.warn("Vendor ID not found in response");
      }
    } else {
      console.warn("Auth endpoint failed, status:", response.status);
      // Agar unauthorized (401) hai to user login nahi hai
      if (response.status === 401) {
        console.warn("User not authenticated, redirect to login");
        // Yahan aap login page redirect kar sakte hain
      }
    }
  } catch (error) {
    console.error("Error fetching vendor:", error);
  }
  
  return null;
};

  // ✅ Fetch services with vendor ID
  const fetchServices = async () => {
    try {
      setLoading(true)
      const currentVendorId = await fetchCurrentVendor()
      if (!currentVendorId) {
        console.error("Vendor ID not found")
        return
      }

      const response = await fetch(`${API_BASE}/api/vendor/services?vendor_id=${currentVendorId}`)
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      } else {
        console.error("Error fetching services")
      }
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Load services on component mount
  useEffect(() => {
    fetchServices()
  }, [])

  // ✅ Update vendor_id when vendorId changes
  useEffect(() => {
    if (vendorId) {
      setForm(prev => ({ ...prev, vendor_id: vendorId }))
    }
  }, [vendorId])

  // ✅ Reset form function
  const resetForm = () => ({
    id: 0,
    name: "",
    category: "",
    eventType: "",
    basePrice: 0,
    description: "",
    packages: [{ packageName: "", price: 0, duration: "", features: [""] }],
    availability: [""],
    location: "",
    portfolioImages: [""],
    isActive: true,
    vendor_id: vendorId || 0
  })

  // ✅ Save service to backend - UPDATED
  const saveService = async (serviceData: Service): Promise<boolean> => {
    try {
      // ✅ Ensure vendor_id is set before saving
      const currentVendorId = vendorId || await fetchCurrentVendor()
      if (!currentVendorId) {
        console.error("Vendor ID not found")
        return false
      }

      // ✅ Create final data with guaranteed vendor_id
      const finalData = {
        ...serviceData,
        vendor_id: currentVendorId
      }

      const method = finalData.id ? 'PUT' : 'POST'
      const url = finalData.id
        ? `${API_BASE}/api/vendor/services/${finalData.id}`
        : `${API_BASE}/api/vendor/services`

      console.log('📤 Sending data:', finalData)

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Service saved:', result)
        await fetchServices()
        return true
      } else {
        const error = await response.json()
        console.error('❌ Server error:', error)
        return false
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      return false
    }
  }

  // ✅ Delete service from backend
  const deleteService = async (serviceId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/vendor/services/${serviceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchServices()
        return true
      } else {
        console.error("Error deleting service")
        return false
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      return false
    }
  }

  // ✅ Toggle service status in backend
  const toggleServiceStatus = async (serviceId: number, currentStatus: boolean): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/vendor/services/${serviceId}/toggle`, {
        method: 'PATCH'
      })

      if (response.ok) {
        await fetchServices()
        return true
      } else {
        console.error("Error toggling service status")
        return false
      }
    } catch (error) {
      console.error("Error toggling service status:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.category || !form.eventType || !form.basePrice || !form.description || !form.location) {
      alert("Please fill all required fields")
      return
    }

    // ✅ Ensure vendor_id is available
    if (!form.vendor_id) {
      const currentVendorId = await fetchCurrentVendor()
      if (!currentVendorId) {
        alert("Vendor ID not found. Please try again.")
        return
      }
      setForm(prev => ({ ...prev, vendor_id: currentVendorId }))
    }

    const success = await saveService(form)

    if (success) {
      setForm(resetForm())
      setIsEditing(false)
      alert(isEditing ? "Service updated successfully!" : "Service added successfully!")
    } else {
      alert("Error saving service. Please try again.")
    }
  }

  const handleEdit = (service: Service) => {
    setForm(service)
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      const success = await deleteService(id)
      if (success) {
        alert("Service deleted successfully!")
      } else {
        alert("Error deleting service. Please try again.")
      }
    }
  }

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const success = await toggleServiceStatus(id, currentStatus)
    if (!success) {
      alert("Error updating service status. Please try again.")
    }
  }

  // ✅ Add package to form
  const addPackage = () => {
    setForm({
      ...form,
      packages: [
        ...form.packages,
        { packageName: "", price: 0, duration: "", features: [""] }
      ]
    })
  }

  // ✅ Update package in form
  const updatePackage = (index: number, field: string, value: any) => {
    const updatedPackages = [...form.packages]
    updatedPackages[index] = { ...updatedPackages[index], [field]: value }
    setForm({ ...form, packages: updatedPackages })
  }

  // ✅ Remove package from form
  const removePackage = (index: number) => {
    if (form.packages.length > 1) {
      const updatedPackages = form.packages.filter((_, i) => i !== index)
      setForm({ ...form, packages: updatedPackages })
    }
  }

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading services...</div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Services</h1>
          <p className="text-muted-foreground">Manage your event services and packages for Eventify platform.</p>
        </div>

        {/* Add Service Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-600">
              {isEditing ? "Edit Service" : "Add New Service"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Premium Wedding Photography"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Service Category *</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Photography, Catering, Decoration"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <Select value={form.eventType} onValueChange={(value) => setForm({ ...form, eventType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wedding">Wedding</SelectItem>
                    <SelectItem value="Conference">Conference</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Concert">Concert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (PKR) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  placeholder="e.g. 35000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Service Location *</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Lahore, Pakistan"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Service Description *</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your service in detail including what's included..."
                  required
                />
              </div>

              {/* Packages Section */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Service Packages</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPackage}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Add Package
                  </Button>
                </div>

                {form.packages.map((pkg, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Package Name</Label>
                        <Input
                          value={pkg.packageName}
                          onChange={(e) => updatePackage(index, 'packageName', e.target.value)}
                          placeholder="e.g. Basic Package"
                        />
                      </div>
                      <div>
                        <Label>Price (PKR)</Label>
                        <Input
                          type="number"
                          value={pkg.price}
                          onChange={(e) => updatePackage(index, 'price', Number(e.target.value))}
                          placeholder="e.g. 20000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Duration</Label>
                      <Input
                        value={pkg.duration}
                        onChange={(e) => updatePackage(index, 'duration', e.target.value)}
                        placeholder="e.g. 4 hours, Full Day"
                      />
                    </div>

                    <div>
                      <Label>Features (one per line)</Label>
                      <Textarea
                        value={pkg.features.join('\n')}
                        onChange={(e) => updatePackage(index, 'features', e.target.value.split('\n'))}
                        placeholder="200 edited photos&#10;Online gallery&#10;1 photographer"
                        rows={3}
                      />
                    </div>

                    {form.packages.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePackage(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Remove Package
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 flex justify-end gap-4">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setForm(resetForm())
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                >
                  {isEditing ? "Update Service" : "Add Service"}
                  {!isEditing && <PlusCircle className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Service List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {service.category}
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {service.eventType}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${service.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{service.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    <span>{service.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span>Base Price: PKR {service.basePrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Packages:</h4>
                  {service.packages.map((pkg, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{pkg.packageName}</span>
                        <span className="text-purple-600 font-bold">PKR {pkg.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">{pkg.duration}</p>
                      <ul className="text-xs text-gray-700 mt-1">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(service.id, service.isActive)}
                  >
                    {service.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <PlusCircle className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Services Added</h3>
              <p className="text-gray-500">Start by adding your first service to get bookings on Eventify.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </VendorLayout>
  )
}