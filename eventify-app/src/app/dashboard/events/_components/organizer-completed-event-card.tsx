"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapPin, Star } from "lucide-react"
import type { DashboardEvent, AssignedReviewStatus } from "../_lib/types"

const DEFAULT_IMG = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&q=80"

type Props = {
  event: DashboardEvent
  showVendorSection: boolean
  assignedReviewByEvent: Record<number, AssignedReviewStatus>
  onOpenReview: (p: { eventId: number; vendorId: number; vendorName: string }) => void
}

export function OrganizerCompletedEventCard({ event, showVendorSection, assignedReviewByEvent, onOpenReview }: Props) {
  return (
    <Card className="group overflow-hidden border-slate-200/60 shadow-sm rounded-[32px] bg-slate-50">
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        <img
          src={event.image_url || DEFAULT_IMG}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          alt={event.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="bg-white/90 backdrop-blur-md text-purple-600 border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            {event.vendor_category}
          </Badge>
          <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Completed
          </Badge>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
              {event.name}
            </h3>
            <div className="flex items-center gap-2 text-slate-500 mt-1 text-xs font-medium">
              <MapPin className="h-3 w-3 text-purple-500" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Completed On</span>
            <span className="text-slate-600">
              {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Final Progress</span>
            <span className="text-purple-600">100%</span>
          </div>
          <Progress value={100} className="h-2 bg-slate-100" />
          {showVendorSection && event.completed_vendors && event.completed_vendors.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-200 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rate vendors</p>
              {event.completed_vendors.map((v) => {
                const reviewed = assignedReviewByEvent[event.id]?.my_organizer_to_vendor?.[String(v.id)]
                if (reviewed) {
                  return (
                    <p key={v.id} className="text-xs font-bold text-emerald-600">
                      Reviewed {v.name}
                    </p>
                  )
                }
                return (
                  <Button
                    key={v.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest gap-2"
                    onClick={() =>
                      onOpenReview({ eventId: event.id, vendorId: v.id, vendorName: v.name })
                    }
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    Rate {v.name}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
