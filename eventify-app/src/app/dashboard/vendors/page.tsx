"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  Send,
  X,
  Calendar,
  Search,
  LayoutGrid,
  List,
  Star,
  ExternalLink,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Vendor {
  id: number;
  name: string;
  category: string;
  email: string;
  phone: string;
  city: string;
  profile_image?: string;
  rating?: number;
  assigned_events: any[];
  assigned_events_count: number;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number;
  receiver_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  timestamp: string;
}

interface Conversation {
  vendor_id: number;
  vendor_name: string;
  vendor_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  assigned_events: { id: number; name: string }[];
  event_id?: number;
  event_name?: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  eventType: string;
  basePrice: number;
  description: string;
  packages: ServicePackage[];
  availability: string[];
  location: string;
  portfolioImages: string[];
  isActive: boolean;
  vendor_id: number;
}

interface ServicePackage {
  packageName: string;
  price: number;
  duration: string;
  features: string[];
}

// Debounce hook for performance
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function VendorsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <VendorsPageContent />
    </Suspense>
  );
}

function VendorsPageContent() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filtered, setFiltered] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // SERVICES DIALOG STATE
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [selectedVendorServices, setSelectedVendorServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [currentVendorForServices, setCurrentVendorForServices] = useState<Vendor | null>(null);

  // CHAT STATE
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const debouncedSearch = useDebounce(search, 300);

  const initVendorId = searchParams.get("vendorId");
  const openServices = searchParams.get("openServices");

  const fetchVendorServices = useCallback(async (vendorId: number) => {
    setServicesLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/vendor/services?vendor_id=${vendorId}`);
      if (response.ok) {
        const services = await response.json();
        setSelectedVendorServices(services);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openServices === "true" && initVendorId && vendors.length > 0 && !loading) {
      const vid = parseInt(initVendorId);
      const vendor = vendors.find(v => v.id === vid);
      if (vendor) {
        setCurrentVendorForServices(vendor);
        setServicesDialogOpen(true);
        fetchVendorServices(vid);
        // Clear params
        router.replace(pathname, { scroll: false });
      }
    }
  }, [openServices, initVendorId, vendors, loading, router, pathname, fetchVendorServices]);


  const getOrganizerId = (): number | null => {
    if (typeof window === "undefined") return null;
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id || user._id;
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    return null;
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token")?.replace(/['"]+/g, "").trim() : null;
  const organizerId = getOrganizerId();

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/vendors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVendors(data);
      } else {
        setVendors([]);
      }
    } catch (err) {
      console.error("Error loading vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const fetchOrganizerConversations = useCallback(async () => {
    if (!organizerId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/chat/organizer/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }, [organizerId, token]);

  const fetchChatMessages = useCallback(async (vendorId: number) => {
    if (!organizerId || !token) return;
    setChatLoading(true);
    try {
      // ✅ Use the new full-conversation endpoint
      const res = await fetch(`http://localhost:5000/api/chat/full-conversation/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);

        // ✅ Clear chat notifications for this vendor
        try {
          fetch("http://localhost:5000/api/payments/notifications/clear-chat", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sender_id: vendorId }),
          });
        } catch (clearErr) {
          console.error("Failed to clear chat notifications:", clearErr);
        }

        // Mark as read - the backend now handles context better
        // We can still try to mark as read if we have an event id
        if (data.messages.length > 0) {
          await fetch("http://localhost:5000/api/chat/mark-read", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ event_id: data.messages[data.messages.length - 1].event_id }),
          });
        }
        fetchOrganizerConversations();
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    } finally {
      setChatLoading(false);
    }
  }, [organizerId, token, fetchOrganizerConversations]);

  useEffect(() => {
    if (initVendorId && !openServices && vendors.length > 0 && !loading) {
      const vid = parseInt(initVendorId);
      const vendor = vendors.find(v => v.id === vid);
      if (vendor) {
        // Only open if not already open
        if (!chatDialogOpen || (selectedConversation && selectedConversation.vendor_id !== vid)) {
          const existingConv = conversations.find(c => c.vendor_id === vid);
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else {
            setSelectedConversation({
              vendor_id: vendor.id,
              vendor_name: vendor.name,
              vendor_email: vendor.email,
              last_message: "",
              last_message_time: "",
              unread_count: 0,
              assigned_events: vendor.assigned_events || []
            });
          }
          setChatDialogOpen(true);
          fetchChatMessages(vid);

          // ✅ Clear URL params to allow closing the modal without auto-reopening
          router.replace(pathname, { scroll: false });
        }
      }
    }
  }, [initVendorId, vendors, loading, conversations, fetchChatMessages, chatDialogOpen, selectedConversation, router, pathname, openServices]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !organizerId || !token) return;

    // ✅ Backend REQUIRES an event_id. We'll use the first assigned event or any relevant one.
    const eventId = selectedConversation.event_id || selectedConversation.assigned_events?.[0]?.id;

    if (!eventId) {
      toast({ title: "No Event Context", description: "You can only chat with vendors assigned to your events.", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedConversation.vendor_id,
          message: newMessage.trim(),
          event_id: eventId, // ✅ Required field
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, data.chat_message]);
        setNewMessage("");
        fetchOrganizerConversations();
      } else {
        const errData = await res.json();
        toast({ title: "Error", description: errData.error || "Failed to send", variant: "destructive" });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };


  useEffect(() => {
    loadVendors();
    loadEvents();
    fetchOrganizerConversations();
  }, [fetchOrganizerConversations]);

  useEffect(() => {
    let filteredData = vendors;
    if (category !== "All") {
      filteredData = filteredData.filter((v) => v.category === category);
    }
    if (debouncedSearch.trim()) {
      filteredData = filteredData.filter((v) =>
        v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        v.city.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        v.category.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    setFiltered(filteredData);
  }, [debouncedSearch, category, vendors]);

  const handleAssignVendor = async (vendorId: number) => {
    if (!selectedEvent) {
      toast({ title: "Select Event", description: "Please select an event first.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/vendors/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor_id: vendorId, event_id: selectedEvent }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Vendor Assigned", description: data.message });
        setAssignModalOpen(false);
        setSelectedEvent("");
        loadVendors();
      } else {
        toast({ title: "Assignment Failed", description: data.error || "Failed to assign vendor", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 p-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vendor Marketplace</h1>
            <p className="text-slate-500 mt-1 font-medium">Discover and partner with the finest event professionals in the industry.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">{vendors.length} Total Partners</span>
            </div>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
              <Input
                placeholder="Search by name, city or specialty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-purple-600/20"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48 h-12 bg-slate-50 border-none rounded-2xl font-semibold focus:ring-2 focus:ring-purple-600/20">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                <SelectItem value="All">All Specialties</SelectItem>
                {["Wedding", "Conference", "Corporate", "Workshop", "Birthday", "Concert"].map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <Button
              variant={viewMode === "grid" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-9 w-9 rounded-xl ${viewMode === "grid" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "outline" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-9 w-9 rounded-xl ${viewMode === "list" ? "bg-white shadow-sm border-slate-100" : "border-transparent text-slate-400"}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Calling elite vendors...</p>
          </div>
        ) : filtered.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((vendor) => (
                <Card key={vendor.id} className="group overflow-hidden border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-purple-100 hover:border-purple-200 transition-all duration-500 rounded-[32px] bg-white">
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={vendor.profile_image || `https://images.unsplash.com/photo-1556740758-90de374c12ad?w=500&q=80`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={vendor.name}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 backdrop-blur-md text-purple-600 border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {vendor.category}
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-black text-slate-900">{vendor.rating || "5.0"}</span>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors uppercase tracking-tight">{vendor.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 text-purple-500" />
                          <span className="truncate">{vendor.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3" /> {vendor.email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {vendor.phone}
                        </div>
                      </div>
                      {vendor.assigned_events_count > 0 && (
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Jobs</span>
                          <Badge variant="secondary" className="bg-white border-slate-100 text-purple-700 font-black">
                            {vendor.assigned_events_count}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 group/btn"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setAssignModalOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl h-10 border-slate-200 hover:bg-slate-50 hover:text-purple-600 group/btn"
                        onClick={() => {
                          setCurrentVendorForServices(vendor);
                          setServicesDialogOpen(true);
                          fetchVendorServices(vendor.id);
                        }}
                      >
                        <Briefcase className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                      </Button>
                      <Button
                        variant="outline"
                        disabled={vendor.assigned_events_count === 0}
                        className="relative rounded-xl h-10 border-slate-200 hover:bg-slate-50 hover:text-purple-600 group/btn"
                        onClick={async () => {
                          await fetchChatMessages(vendor.id);
                          const conv = conversations.find(c => c.vendor_id === vendor.id);
                          setSelectedConversation(conv || {
                            vendor_id: vendor.id,
                            vendor_name: vendor.name,
                            vendor_email: vendor.email,
                            last_message: "",
                            last_message_time: "",
                            unread_count: 0,
                            assigned_events: vendor.assigned_events
                          });
                          setChatDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                        {conversations.find(c => c.vendor_id === vendor.id)?.unread_count ? (
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                            {conversations.find(c => c.vendor_id === vendor.id)?.unread_count}
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor Profile</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialty & City</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm">
                            <img src={vendor.profile_image || `https://images.unsplash.com/photo-1556740758-90de374c12ad?w=100&q=80`} className="h-full w-full object-cover" />
                          </Avatar>
                          <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{vendor.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-none font-bold text-[10px] px-2.5">
                            {vendor.category}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <MapPin className="h-3 w-3" /> {vendor.city}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1 text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {vendor.email}</div>
                          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {vendor.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-[10px] font-black">{vendor.rating || "5.0"}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {vendor.assigned_events_count} active jobs
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-md hover:text-purple-600 border border-transparent hover:border-slate-100"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setAssignModalOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-md hover:text-purple-600 border border-transparent hover:border-slate-100"
                            onClick={() => {
                              setCurrentVendorForServices(vendor);
                              setServicesDialogOpen(true);
                              fetchVendorServices(vendor.id);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={vendor.assigned_events_count === 0}
                            className="relative h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-md hover:text-purple-600 border border-transparent hover:border-slate-100 group/btn"
                            onClick={async () => {
                              await fetchChatMessages(vendor.id);
                              const conv = conversations.find(c => c.vendor_id === vendor.id);
                              setSelectedConversation(conv || {
                                vendor_id: vendor.id,
                                vendor_name: vendor.name,
                                vendor_email: vendor.email,
                                last_message: "",
                                last_message_time: "",
                                unread_count: 0,
                                assigned_events: vendor.assigned_events || []
                              });
                              setChatDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            {conversations.find(c => c.vendor_id === vendor.id)?.unread_count ? (
                              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-white animate-pulse">
                                {conversations.find(c => c.vendor_id === vendor.id)?.unread_count}
                              </span>
                            ) : null}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Briefcase className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">No Vendors Found</h3>
            <p className="text-slate-500 mt-2 max-w-xs text-center font-medium">We couldn't find any partners matching your search. Try refining your criteria.</p>
          </div>
        )}
      </div>

      {/* MODALS PERSISTED FROM PREVIOUS VERSION BUT STYLED */}

      {/* Assign Vendor Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="rounded-[40px] border-none shadow-2xl p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Assign {selectedVendor?.name}</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Bridge the partnership by assigning this elite vendor to one of your live projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Live Projects</label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-purple-600/20">
                  <SelectValue placeholder="Select an event ecosystem" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {events.filter(event =>
                    !selectedVendor?.assigned_events?.some((ae: any) => ae.id === event.id)
                  ).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No unassigned active events found</div>
                  ) : (
                    events
                      .filter(event => !selectedVendor?.assigned_events?.some((ae: any) => ae.id === event.id))
                      .map((event) => (
                        <SelectItem key={event.id} value={String(event.id)} className="rounded-xl py-3 font-medium">
                          {event.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setAssignModalOpen(false)} className="rounded-2xl h-12 font-bold px-6">Cancel</Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 font-black px-8 shadow-xl shadow-slate-200 disabled:opacity-50"
              disabled={!selectedEvent}
              onClick={() => handleAssignVendor(selectedVendor?.id!)}
            >
              Confirm Partnership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Services Dialog */}
      <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-[40px] border-none shadow-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Vendor Services - {currentVendorForServices?.name}</DialogTitle>
            <DialogDescription>List of services and packages offered by the vendor</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 p-8 text-white relative">
            <Button
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
              onClick={() => setServicesDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4 mb-2">
              <Avatar className="h-16 w-16 rounded-2xl border-2 border-white/20">
                <img src={currentVendorForServices?.profile_image || `https://images.unsplash.com/photo-1556740758-90de374c12ad?w=100&q=80`} className="object-cover" />
              </Avatar>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">{currentVendorForServices?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-purple-600 text-[10px] font-black uppercase tracking-widest border-none">
                    {currentVendorForServices?.category}
                  </Badge>
                  <span className="text-xs text-slate-400 font-bold">{currentVendorForServices?.city}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
            {servicesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading catalog...</p>
              </div>
            ) : selectedVendorServices.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">No Services Listed</h3>
                <p className="text-slate-500 font-medium">This vendor hasn't updated their service catalog yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedVendorServices.map((service) => (
                  <Card key={service.id} className="rounded-[32px] overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white group hover:-translate-y-1 duration-300">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{service.name}</h3>
                        <Badge variant="outline" className={`rounded-lg text-[10px] font-black ${service.isActive ? "border-emerald-100 text-emerald-600" : "border-slate-100 text-slate-400"}`}>
                          {service.isActive ? "ACTIVE" : "OFFLINE"}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{service.description}</p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fixed Start</div>
                        <div className="text-xl font-black text-slate-900">PKR {service.basePrice?.toLocaleString()}</div>
                      </div>

                      {service.packages && service.packages.length > 0 && (
                        <div className="mt-6 space-y-3">
                          {service.packages.map((pkg, idx) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{pkg.packageName}</span>
                                <span className="text-xs font-black text-purple-600">PKR {pkg.price?.toLocaleString()}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {pkg.features.slice(0, 3).map((f, fi) => (
                                  <span key={fi} className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-slate-100 text-slate-500 font-bold">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-2xl h-[650px] flex flex-col rounded-[40px] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Chat with {selectedConversation?.vendor_name}</DialogTitle>
            <DialogDescription>Message history and communication hub</DialogDescription>
          </DialogHeader>
          <div className="bg-purple-600 p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <img src={`https://images.unsplash.com/photo-1556740758-90de374c12ad?w=100&q=80`} className="object-cover" />
              </Avatar>
              <div>
                <h3 className="font-black uppercase tracking-tight text-sm">Chat with {selectedConversation?.vendor_name}</h3>
                <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Active Partner</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setChatDialogOpen(false)} className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 scrollbar-hide">
            {chatLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin w-6 h-6 text-purple-600" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="h-16 w-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-purple-200" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Initialize Communication</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Send a message to sync with your partner.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === organizerId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-5 py-3 rounded-2xl shadow-sm ${msg.sender_id === organizerId
                      ? "bg-purple-600 text-white rounded-tr-none"
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                      }`}
                  >
                    <p className="text-sm font-medium leading-relaxed">{msg.message}</p>
                    <div className="flex items-center justify-between mt-2 gap-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${msg.sender_id === organizerId ? "text-purple-200" : "text-slate-400"}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 bg-slate-50 p-2 rounded-[24px] border border-slate-100 focus-within:ring-2 focus-within:ring-purple-600/20 transition-all">
              <Input
                placeholder="Draft your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 shadow-none font-medium text-slate-700"
                onKeyPress={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 h-10 w-10 rounded-xl p-0 flex items-center justify-center shadow-lg shadow-purple-100"
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
