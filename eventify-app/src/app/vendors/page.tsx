"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, Bell, Sparkles, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const vendors = [
  {
    id: 1,
    name: "Elegant Catering",
    category: "Catering",
    rating: 4.5,
    reviews: 128,
    price: 50,
    image: "/elegant-catering-gold-plate.jpg",
    badge: "TOP RATED",
    badgeColor: "bg-pink-500",
  },
  {
    id: 2,
    name: "DJ Beats Unlimited",
    category: "Entertainment",
    rating: 4.7,
    reviews: 94,
    price: 300,
    image: "/dj-equipment-turntables-mixer.jpg",
  },
  {
    id: 3,
    name: "Floral Designs by Lily",
    category: "Decoration",
    rating: 4.8,
    reviews: 210,
    price: 200,
    image: "/open-book-pages-fanned-out.jpg",
  },
  {
    id: 4,
    name: "Photography by Ethan",
    category: "Photography",
    rating: 4.6,
    reviews: 55,
    price: 450,
    image: "/forest-trees-green-nature-sunlight.jpg",
    badge: "NEW",
    badgeColor: "bg-green-500",
  },
  {
    id: 5,
    name: "The Grand Venue",
    category: "Venue",
    rating: 4.9,
    reviews: 150,
    price: 1200,
    image: "/elegant-venue-interior-table-chairs.jpg",
  },
  {
    id: 6,
    name: "Dream Day Planners",
    category: "Planning",
    rating: 4.8,
    reviews: 78,
    price: 800,
    image: "/eco-event-planning-natural-sage-green.jpg",
  },
  {
    id: 7,
    name: "Amplify Pro Audio",
    category: "Entertainment",
    rating: 4.4,
    reviews: 42,
    price: 250,
    image: "/wicker-pendant-lamp-dark-background.jpg",
  },
  {
    id: 8,
    name: "Thematic Creations",
    category: "Decoration",
    rating: 4.7,
    reviews: 66,
    price: 150,
    image: "/elegant-entrance-night-lighting-plants.jpg",
  },
]

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [ratingFilter, setRatingFilter] = useState("4+")
  const [locationFilter, setLocationFilter] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">Eventify</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
                  Home
                </Link>
                <Link href="/vendors" className="text-purple-600 font-semibold border-b-2 border-purple-600 pb-1">
                  Vendors
                </Link>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
                  Events
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium">
                  About
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              <img src="/professional-woman-avatar.png" alt="Profile" className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Find Your Perfect Vendor</h1>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 rounded-lg">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Category</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="decoration">Decoration</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="venue">Venue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 rounded-lg">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Price Range</SelectItem>
                  <SelectItem value="0-100">$0 - $100</SelectItem>
                  <SelectItem value="100-500">$100 - $500</SelectItem>
                  <SelectItem value="500+">$500+</SelectItem>
                </SelectContent>
              </Select>

              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-full font-medium cursor-pointer">
                Rating: 4+ <X className="h-3 w-3 ml-1" />
              </Badge>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 rounded-lg">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Location</SelectItem>
                  <SelectItem value="ny">New York</SelectItem>
                  <SelectItem value="la">Los Angeles</SelectItem>
                  <SelectItem value="sf">San Francisco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 rounded-lg text-purple-600">
                  <SelectValue placeholder="Relevance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Vendor Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={vendor.image || "/placeholder.svg"}
                  alt={vendor.name}
                  className="w-full h-full object-cover"
                />
                {vendor.badge && (
                  <Badge
                    className={`absolute top-3 right-3 ${vendor.badgeColor} text-white px-2 py-1 text-xs font-semibold rounded`}
                  >
                    {vendor.badge}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{vendor.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Starting at <span className="text-green-600 font-semibold">${vendor.price}</span>
                  {vendor.price < 100 ? "/person" : ""}
                </p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(vendor.rating)
                          ? "fill-purple-600 text-purple-600"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">({vendor.reviews})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2024 Eventify. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-gray-900">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
