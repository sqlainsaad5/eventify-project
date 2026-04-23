"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { ReviewDialog } from "@/components/review-dialog"
import type { EventApplicationRow } from "../_lib/types"

type Props = {
    applicationsModalEventId: number | null
    setApplicationsModalEventId: (v: number | null) => void
    applications: EventApplicationRow[]
    loadingApplications: boolean
    assigningOrganizerId: number | null
    onAssign: (eventId: number, organizerId: number) => void
    reviewDialog: { eventId: number; organizerId: number; organizerName: string } | null
    setReviewDialog: (v: { eventId: number; organizerId: number; organizerName: string } | null) => void
    onSubmitReview: (rating: number, comment: string | undefined) => Promise<void>
}

export function MyEventsModals({
    applicationsModalEventId,
    setApplicationsModalEventId,
    applications,
    loadingApplications,
    assigningOrganizerId,
    onAssign,
    reviewDialog,
    setReviewDialog,
    onSubmitReview,
}: Props) {
    return (
        <>
            {applicationsModalEventId !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setApplicationsModalEventId(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-black text-slate-900">Applications</h3>
                            <p className="text-sm text-slate-500 mt-1">Choose an organizer to assign to this event.</p>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingApplications ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                </div>
                            ) : applications.length === 0 ? (
                                <p className="text-slate-500 text-sm font-medium py-6 text-center">
                                    No applications yet. Your event is visible to active organizers; they can apply from their dashboard.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {applications
                                        .filter((a) => a.status === "pending")
                                        .map((app) => (
                                            <li
                                                key={app.id}
                                                className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-900 truncate">{app.organizer_name || "Organizer"}</p>
                                                    {app.organizer_email && (
                                                        <p className="text-xs text-slate-500 truncate">{app.organizer_email}</p>
                                                    )}
                                                    {app.message && (
                                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{app.message}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={() => onAssign(applicationsModalEventId, app.organizer_id)}
                                                    disabled={assigningOrganizerId !== null}
                                                    className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase"
                                                >
                                                    {assigningOrganizerId === app.organizer_id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Assign"
                                                    )}
                                                </Button>
                                            </li>
                                        ))}
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
