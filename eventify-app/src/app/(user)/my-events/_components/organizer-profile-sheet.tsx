"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { OrganizerProfileRow } from "../_lib/types"
import {
    availabilityBadgeClass,
    availabilityLabel,
    getHostRatingDisplay,
    normalizeAvailability,
    type OrganizerRatingSummaries,
} from "../_lib/organizer-display"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    org: OrganizerProfileRow | null
    organizerSummaries: OrganizerRatingSummaries
    primaryLabel: string
    onPrimary: () => void
    primaryDisabled?: boolean
    primaryLoading?: boolean
    /** Optional e.g. Decline application */
    secondaryLabel?: string
    onSecondary?: () => void
    secondaryLoading?: boolean
    secondaryDisabled?: boolean
    contentClassName?: string
}

export function OrganizerProfileSheet({
    open,
    onOpenChange,
    org,
    organizerSummaries,
    primaryLabel,
    onPrimary,
    primaryDisabled,
    primaryLoading,
    secondaryLabel,
    onSecondary,
    secondaryLoading,
    secondaryDisabled,
    contentClassName,
}: Props) {
    if (!org) return null

    const av = normalizeAvailability(org.organizer_availability)
    const canSelect = av !== "unavailable"
    const rp = getHostRatingDisplay(org, organizerSummaries)
    const vr = organizerSummaries[org.id]?.vendor
    const disabledPrimary = !canSelect || !!primaryDisabled

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className={cn("w-full sm:max-w-lg overflow-y-auto border-slate-200", contentClassName)}>
                <SheetHeader className="text-left space-y-1 pr-8">
                    <SheetTitle className="text-xl font-black tracking-tight">{org.name || "Organizer"}</SheetTitle>
                    <SheetDescription>
                        Full profile, ratings, and package notes for this expert.
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 px-4 pb-8">
                    <Avatar className="h-24 w-24 rounded-2xl shadow-lg ring-2 ring-slate-100">
                        <AvatarImage src={org.profile_image || undefined} alt={org.name || "Organizer"} className="object-cover" />
                        <AvatarFallback className="rounded-2xl text-2xl font-black bg-indigo-600 text-white">
                            {(org.name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] font-black uppercase tracking-widest border", availabilityBadgeClass(av))}
                    >
                        {availabilityLabel(av)}
                    </Badge>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location & focus</p>
                        <p className="text-sm font-bold text-slate-800">
                            {[org.city, org.category].filter(Boolean).join(" · ") || "Not specified"}
                        </p>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Host reviews</p>
                        {rp.count > 0 && rp.avg != null ? (
                            <p className="text-sm text-slate-700">
                                <span className="font-black text-amber-600 tabular-nums text-lg">{rp.avg.toFixed(1)}</span>
                                <span className="text-slate-600">
                                    {" "}
                                    ★ average from {rp.count} client review{rp.count === 1 ? "" : "s"} (hosts who booked this organizer).
                                </span>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No published host reviews yet.</p>
                        )}
                    </div>
                    {vr && vr.count > 0 && vr.avg != null && (
                        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor-side reviews</p>
                            <p className="text-sm text-slate-700">
                                <span className="font-black text-indigo-600 tabular-nums text-lg">{Number(vr.avg).toFixed(1)}</span>
                                <span className="text-slate-600">
                                    {" "}
                                    ★ from {vr.count} review{vr.count === 1 ? "" : "s"} (as a vendor partner).
                                </span>
                            </p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Package & services summary</p>
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {org.organizer_package_summary?.trim() ? (
                                org.organizer_package_summary
                            ) : (
                                <span className="text-slate-500 italic">This organizer has not added a package summary yet.</span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            type="button"
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700"
                            disabled={disabledPrimary || !!primaryLoading}
                            onClick={onPrimary}
                        >
                            {primaryLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    Please wait…
                                </span>
                            ) : (
                                primaryLabel
                            )}
                        </Button>
                        {secondaryLabel && onSecondary && (
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl font-black uppercase tracking-widest text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50"
                                disabled={!!secondaryDisabled}
                                onClick={onSecondary}
                            >
                                {secondaryLoading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                        Please wait…
                                    </span>
                                ) : (
                                    secondaryLabel
                                )}
                            </Button>
                        )}
                        {!canSelect && (
                            <p className="text-xs text-rose-600 font-bold text-center">
                                Not accepting new events — choose another organizer.
                            </p>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
