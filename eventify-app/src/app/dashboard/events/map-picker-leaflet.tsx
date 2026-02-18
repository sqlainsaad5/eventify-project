"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge"; // Added Badge import
import { MapPin, Search, X, Check, Navigation, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  isOpen: boolean;
  onClose: () => void;
}

// Default center (Islamabad, Pakistan)
const defaultCenter: [number, number] = [33.6844, 73.0479];

// Custom clickable map component that can handle click events
const ClickableMap = dynamic(
  () => {
    return import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod;

      // Create a component that handles map clicks
      const ClickableMapComponent = ({
        onClick,
      }: {
        onClick: (lat: number, lng: number) => void;
      }) => {
        useMapEvents({
          click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };

      return ClickableMapComponent;
    });
  },
  { ssr: false }
);

// Fix for default markers - use CDN URLs
const setupLeafletIcons = () => {
  if (typeof window !== "undefined") {
    // Only run on client side
    const L = require("leaflet");

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    // Use CDN URLs for marker icons
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
};

export default function MapPickerLeaflet({
  onLocationSelect,
  initialLocation,
  isOpen,
  onClose,
}: MapPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(initialLocation ? 15 : 10);
  const [mapReady, setMapReady] = useState(false);
  const { toast } = useToast();

  // Initialize Leaflet icons when component mounts
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setupLeafletIcons();
      setMapReady(true);
    }
  }, [isOpen]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      setIsLoading(true);

      try {
        // Use Nominatim (OpenStreetMap's geocoding service) - FREE
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );

        if (response.ok) {
          const data = await response.json();
          const address =
            data.display_name ||
            `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

          const newLocation: Location = { lat, lng, address };
          setSelectedLocation(newLocation);

          toast({
            title: "Location Selected",
            description: "Click Confirm to save this location",
          });
        } else {
          const address = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
          const newLocation: Location = { lat, lng, address };
          setSelectedLocation(newLocation);

          toast({
            title: "Location Selected",
            description:
              "Address not found. You can manually enter the venue name.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        const address = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        const newLocation: Location = { lat, lng, address };
        setSelectedLocation(newLocation);

        toast({
          title: "Location Selected",
          description:
            "Error getting address. You can manually enter the venue name.",
          variant: "default",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);

    try {
      // Use Nominatim for forward geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + " Pakistan"
        )}&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const place = data[0];
          const lat = parseFloat(place.lat);
          const lng = parseFloat(place.lon);
          const address = place.display_name || searchQuery;

          const newLocation: Location = { lat, lng, address };
          setSelectedLocation(newLocation);
          setMapCenter([lat, lng]);
          setZoom(15);

          toast({
            title: "Location Found",
            description: address.substring(0, 100) + "...",
          });
        } else {
          toast({
            title: "Location Not Found",
            description: "Please try a different address or search term.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Unable to search for location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use current location
  // Use current location with better error handling
  // Simplified version focusing on map clicking
  const useCurrentLocation = () => {
    toast({
      title: "Manual Selection Required",
      description:
        "Please click on the map to select your location. Drag to move around.",
      variant: "default",
    });

    // Center on a major city for convenience
    const defaultLocation: Location = {
      lat: 33.6844,
      lng: 73.0479,
      address: "Click on map to select location",
    };

    setSelectedLocation(defaultLocation);
    setMapCenter([defaultLocation.lat, defaultLocation.lng]);
    setZoom(12);
  };

  // Confirm selection
  const handleConfirm = () => {
    if (!selectedLocation) {
      toast({
        title: "No location selected",
        description: "Please select a location on the map first.",
        variant: "destructive",
      });
      return;
    }

    onLocationSelect(selectedLocation);
    onClose();

    toast({
      title: "Location Saved",
      description: selectedLocation.address.substring(0, 100) + "...",
    });
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Set initial location
  useEffect(() => {
    if (initialLocation) {
      setMapCenter([initialLocation.lat, initialLocation.lng]);
      setZoom(15);
    }
  }, [initialLocation]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-0 shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-xl">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              Select Event Location
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 font-medium mt-2">
            Pinpoint your venue on the map or search for a specific address to anchor your event.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
              <Input
                placeholder="Search for a landmark, street or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-semibold shadow-inner focus-visible:ring-2 focus-visible:ring-purple-600/20"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Locate"
              )}
            </Button>
          </form>

          {/* Map Container */}
          <div className="relative h-[400px] rounded-[32px] overflow-hidden border border-slate-100 shadow-inner group">
            {mapReady ? (
              <MapContainer
                center={mapCenter}
                zoom={zoom}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ClickableMap onClick={handleMapClick} />

                {selectedLocation && (
                  <Marker
                    position={[selectedLocation.lat, selectedLocation.lng]}
                  >
                    <Popup>{selectedLocation.address}</Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waking up satellites...</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-slate-100">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-sm font-black text-slate-900 uppercase">Geocoding...</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-20">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live Map Interaction Enabled</span>
              </div>
            </div>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="bg-purple-50/50 border border-purple-100 rounded-[32px] p-6 transition-all animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2 flex-1">
                  <h3 className="text-xs font-black text-purple-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Navigation className="h-3 w-3" />
                    Target Destination
                  </h3>
                  <p className="text-slate-900 font-bold text-lg leading-tight">
                    {selectedLocation.address}
                  </p>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="bg-white border-purple-100 text-purple-700 font-bold px-3">Lat: {selectedLocation.lat.toFixed(4)}</Badge>
                    <Badge variant="outline" className="bg-white border-purple-100 text-purple-700 font-bold px-3">Lng: {selectedLocation.lng.toFixed(4)}</Badge>
                  </div>
                </div>
                <Button
                  onClick={handleConfirm}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-16 px-10 font-black shadow-xl shadow-purple-100 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                >
                  <Check className="h-5 w-5 mr-3" />
                  Confirm Coordinates
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Supported by OpenStreetMap Ecosystem</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">Click Map</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">Search Address</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
