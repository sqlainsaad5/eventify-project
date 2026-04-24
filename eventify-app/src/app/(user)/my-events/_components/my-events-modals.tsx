"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Info, Loader2 } from "lucide-react"
import { ReviewDialog } from "@/components/review-dialog"
import type { EventApplicationRow, OrganizerProfileRow } from "../_lib/types"
import type { OrganizerRatingSummaries } from "../_lib/organizer-display"
import { OrganizerProfileSheet } from "./organizer-profile-sheet"

type Props = {
    applicationsModalEventId: number | null
    setApplicationsModalEventId: (v: number | null) => void
    applications: EventApplicationRow[]
    loadingApplications: boolean
    assigningOrganizerId: number | null
    applicationOrganizerSummaries: OrganizerRatingSummaries
    onAssign: (eventId: number, organizerId: number) => void
    reviewDialog: { eventId: number; organizerId: number; organizerName: string } | null
    setReviewDialog: (v: { eventId: number; organizerId: number; organizerName: string } | null) => void
    onSubmitReview: (rating: number, comment: string | undefined) => Promise<void>
}

function organizerProfileForApplication(app: EventApplicationRow): OrganizerProfileRow {
    if (app.organizer_profile) return app.organizer_profile
    return {
        id: app.organizer_id,
        name: app.organizer_name,
        city: null,
        category: null,
        profile_image: null,
        organizer_availability: "available",
        organizer_package_summary: null,
        host_rating_avg: null,
        host_rating_count: 0,
    }
}

export function MyEventsModals({
    applicationsModalEventId,
    setApplicationsModalEventId,
    applications,
    loadingApplications,
    assigningOrganizerId,
    applicationOrganizerSummaries,
    onAssign,
    reviewDialog,
    setReviewDialog,
    onSubmitReview,
}: Props) {
    const [organizerDetailView, setOrganizerDetailView] = useState<OrganizerProfileRow | null>(null)

    useEffect(() => {
        if (applicationsModalEventId === null) setOrganizerDetailView(null)
    }, [applicationsModalEventId])

    const pendingCount = useMemo(
        () => applications.filter((a) => a.status === "pending").length,
        [applications],
    )

    return (
        <>
            {applicationsModalEventId !== null && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setApplicationsModalEventId(null)}
                >
                    <div
                        className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900">Applications</h3>
                                {!loadingApplications && applications.length > 0 && (
                                    <Badge
                                        variant={pendingCount > 0 ? "default" : "secondary"}
                                        className="text-[10px] font-black uppercase tracking-widest"
                                    >
                                        {pendingCount} pending
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Choose an organizer to assign to this event.
                                {pendingCount > 0 && !loadingApplications
                                    ? ` You have ${pendingCount} application${pendingCount === 1 ? "" : "s"} to review.`
                                    : null}
                            </p>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingApplications ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                </div>
                            ) : applications.length === 0 ? (
                                <p className="text-slate-500 text-sm font-medium py-6 text-center">
                                    No applications yet. Your event is visible to active organizers; they can apply from their
                                    dashboard.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {applications
                                        .filter((a) => a.status === "pending")
                                        .map((app) => {
                                            const profile = organizerProfileForApplication(app)
                                            return (
                                                <li
                                                    key={app.id}
                                                    className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900 truncate">
                                                            {app.organizer_name || "Organizer"}
                                                        </p>
                                                        {app.organizer_email && (
                                                            <p className="text-xs text-slate-500 truncate">{app.organizer_email}</p>
                                                        )}
                                                        {app.message && (
                                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{app.message}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-xl font-black uppercase tracking-widest text-[9px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                            onClick={() => setOrganizerDetailView(profile)}
                                                        >
                                                            <Info className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                                            View Details
                                                        </Button>
                                                        <Button
                                                            onClick={() => onAssign(applicationsModalEventId, app.organizer_id)}
                                                            disabled={assigningOrganizerId !== null}
                                                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase"
                                                        >
                                                            {assigningOrganizerId === app.organizer_id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                "Assign"
                                                            )}
                                                        </Button>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                </ul>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100">
                            <Button variant="outline" onClick={() => setApplicationsModalEventId(null)} className="w-full rounded-xl">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <OrganizerProfileSheet
                open={organizerDetailView != null}
                onOpenChange={(open) => {
                    if (!open) setOrganizerDetailView(null)
                }}
                org={organizerDetailView}
                organizerSummaries={applicationOrganizerSummaries}
                primaryLabel="Assign this organizer"
                primaryDisabled={
                    assigningOrganizerId !== null &&
                    organizerDetailView != null &&
                    assigningOrganizerId !== organizerDetailView.id
                }
                primaryLoading={
                    organizerDetailView != null && assigningOrganizerId === organizerDetailView.id
                }
                onPrimary={() => {
                    if (!organizerDetailView || applicationsModalEventId == null) return
                    void onAssign(applicationsModalEventId, organizerDetailView.id)
                }}
            />

            <ReviewDialog
                open={reviewDialog !== null}
                onOpenChange={(open) => {
                    if (!open) setReviewDialog(null)
                }}
                title={reviewDialog ? `Rate ${reviewDialog.organizerName}` : "Rate organizer"}
                description="Your rating helps other hosts choose organizers. This is shared publicly as an aggregate and optional comment."
                onSubmit={onSubmitReview}
            />
        </>
    )
}
