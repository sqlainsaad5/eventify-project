"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapPin, Clock, Trash2 } from "lucide-react"
import type { DashboardEvent } from "../_lib/types"

const THUMB = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&q=80"

type Props = {
  event: DashboardEvent
  activeTab: "personal" | "assigned"
  getUserId: () => number | null
  onDelete: (id: number) => void
  onAssignmentResponse?: (id: number, status: "accepted" | "rejected") => void
  statusLabel: (status?: string) => string
}

export function DashboardEventListRow({
  event,
  activeTab,
  getUserId,
  onDelete,
  onAssignmentResponse,
  statusLabel,
}: Props) {
  const userId = getUserId()
  const organizerAdvancePaid = !!event.organizer_advance_paid
  const organizerFinalPaid = !!event.organizer_final_paid
  const organizerFullyPaid =
    userId != null && event.organizer_id === userId && organizerAdvancePaid && organizerFinalPaid
  const showPendingActions =
    activeTab === "assigned" && event.organizer_status === "pending" && onAssignmentResponse

  return (
    <tr
      className={`transition-colors group ${
        organizerFullyPaid ? "bg-slate-50/80 opacity-90" : "hover:bg-slate-50/80"
      }`}
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
            <img src={event.image_url || THUMB} className="h-full w-full object-cover" alt="" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors block truncate">
              {event.name}
            </span>
            {activeTab === "assigned" && event.organizer_status && !showPendingActions && (
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-tight block mt-0.5">
                {event.organizer_status === "accepted" && "Approved"}
                {event.organizer_status === "rejected" && "Declined"}
                {event.organizer_status !== "pending" &&
                  event.organizer_status !== "accepted" &&
                  event.organizer_status !== "rejected" &&
                  event.organizer_status}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Clock className="h-3 w-3 text-slate-400" />
            {new Date(event.date).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3 w-3" />
            {event.venue}
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[10px] px-2.5">
          {event.vendor_category}
        </Badge>
      </td>
      <td className="px-6 py-5">
        <span className="font-black text-slate-900">Rs {event.budget.toLocaleString()}</span>
      </td>
      <td className="px-6 py-5">
        <div className="w-40 space-y-1.5">
          {organizerFullyPaid && <Badge className="bg-emerald-100 text-emerald-700 font-semibold mb-1">Paid</Badge>}
          <div className="text-[10px] font-bold text-slate-500 truncate">{statusLabel(event.status)}</div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>{event.progress}%</span>
          </div>
          <Progress value={event.progress} className="h-1.5 bg-slate-100" />
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        {showPendingActions ? (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <Button
              size="sm"
              className="h-8 text-[9px] font-black uppercase"
              onClick={() => onAssignmentResponse!(event.id, "accepted")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[9px] font-black uppercase border-red-200 text-red-600"
              onClick={() => onAssignmentResponse!(event.id, "rejected")}
            >
              Decline
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => onDelete(event.id)} className="h-8 w-8 text-slate-300 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  )
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/50">
        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Name</th>
        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date &amp; Location</th>
        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</th>
        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
        <th className="px-6 py-4" />
      </tr>
    </thead>
  )
}

export function DashboardEventListTable({
  events,
  activeTab,
  getUserId,
  onDelete,
  onAssignmentResponse,
  statusLabel,
}: {
  events: DashboardEvent[]
  activeTab: "personal" | "assigned"
  getUserId: () => number | null
  onDelete: (id: number) => void
  onAssignmentResponse?: (id: number, status: "accepted" | "rejected") => void
  statusLabel: (status?: string) => string
}) {
  if (events.length === 0) return null
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-slate-50">
          {events.map((event) => (
            <DashboardEventListRow
              key={event.id}
              event={event}
              activeTab={activeTab}
              getUserId={getUserId}
              onDelete={onDelete}
              onAssignmentResponse={onAssignmentResponse}
              statusLabel={statusLabel}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
