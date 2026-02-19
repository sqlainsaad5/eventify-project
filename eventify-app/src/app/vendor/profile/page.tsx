"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // ✅ Import AvatarImage
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { User, Mail, Phone, MapPin, Briefcase, LogOut, Camera } from "lucide-react"

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  category: string;
  profile_image?: string; // ✅ Add profile_image
  assigned_events: any[];
}

export default function VendorProfilePage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userData, setUserData] = useState<UserData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    city: "",
    role: "",
    category: "",
    profile_image: "",
    assigned_events: []
  })

  // ✅ Improved image upload function
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB')
      return
    }

    setUploading(true)

    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          router.push("/login")
          return
        }
        const cleanToken = token.replace(/['"]+/g, '').trim()
        const base64Data = reader.result as string

        const response = await fetch("http://localhost:5000/api/auth/profile/upload-image", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ image_data: base64Data })
        })

        if (response.ok) {
          const data = await response.json()
          setUserData(data.user)
          alert("Profile image updated successfully!")
        } else {
          const errorData = await response.json()
          alert(`Upload failed: ${errorData.error}`)
        }
      } catch (error) {
        console.error("Error uploading image:", error)
        alert("Failed to upload image. Please try again.")
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      setUploading(false)
      alert("Error reading file")
    }

    reader.readAsDataURL(file)
  }

  // ✅ Remove profile image
  const handleRemoveImage = async () => {
    if (!confirm("Are you sure you want to remove your profile image?")) return

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }
      const cleanToken = token.replace(/['"]+/g, '').trim()
      const response = await fetch("http://localhost:5000/api/auth/profile/upload-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image_data: null })
      })

      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        alert("Profile image removed successfully!")
      } else {
        alert("Failed to remove image")
      }
    } catch (error) {
      console.error("Error removing image:", error)
      alert("Failed to remove image. Please try again.")
    }
  }

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      let token = localStorage.getItem("token")
      if (!token || token === "undefined" || token === "null") {
        console.error("No valid token found")
        router.push("/login")
        return
      }

      // Clean token if it has quotes
      const cleanToken = token.replace(/['"]+/g, '').trim()

      const response = await fetch("http://localhost:5000/api/auth/profile", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
      } else if (response.status === 401 || response.status === 422) {
        console.error("Session invalid or expired")
        handleLogout()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to fetch user profile:", errorData.error || response.statusText)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }
      const cleanToken = token.replace(/['"]+/g, '').trim()
      const response = await fetch("http://localhost:5000/api/auth/profile/update", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: userData.name,
          phone: userData.phone,
          city: userData.city,
          category: userData.category
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        setIsEditing(false)
        alert("Profile updated successfully!")
      } else {
        const errorData = await response.json()
        alert(`Update failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/login")
  }

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </VendorLayout>
    )
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase()
  }

  return (
    <VendorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Vendor Profile</h1>
          <p className="text-muted-foreground">Manage your vendor account information</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-card-foreground">Vendor Information</CardTitle>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <Avatar className="h-24 w-24 mb-4">
                  {userData.profile_image ? (
                    <AvatarImage
                      src={userData.profile_image}
                      alt={userData.name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Image Upload Controls */}
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-image" className="cursor-pointer">
                        <div className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors">
                          <Camera className="h-4 w-4 text-gray-700" />
                        </div>
                      </Label>
                      {userData.profile_image && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={handleRemoveImage}
                          disabled={uploading}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                id="profile-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading || !isEditing}
              />

              {uploading && (
                <p className="text-sm text-muted-foreground">Uploading image...</p>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-card-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Business Name
                  </Label>
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    disabled={true}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-card-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Number
                  </Label>
                  <Input
                    id="phone"
                    value={userData.phone || ""}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background"
                    placeholder="Add contact number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-card-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Area
                  </Label>
                  <Input
                    id="city"
                    value={userData.city || ""}
                    onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background"
                    placeholder="Add service area"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-card-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Service Category
                </Label>
                <Select
                  value={userData.category || ""}
                  onValueChange={(value) => setUserData({ ...userData, category: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select service category" />
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
            </div>
          </CardContent>
        </Card>

        {/* Rest of your components remain the same */}
        {/* Vendor Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Business Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-card-foreground">{userData.assigned_events?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Active Events</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-card-foreground">{userData.assigned_events?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Events</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-card-foreground">100%</p>
                <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Events */}
        {userData.assigned_events && userData.assigned_events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-card-foreground">Assigned Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userData.assigned_events.map((event: any) => (
                  <div key={event.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.date} • {event.venue}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${event.budget}</p>
                      <p className="text-sm text-muted-foreground">{event.vendor_category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout Section */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Logout from your account</p>
                <p className="text-sm text-muted-foreground">You will need to sign in again to access your account</p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  )
}