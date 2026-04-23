"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { useMyEventsDashboard } from "../_lib/use-my-events-dashboard"
import { partitionUserEvents } from "../_lib/partition-user-events"
import { UserActiveCompletedEventCard } from "./user-event-cards"
import { MyEventsModals } from "./my-events-modals"

type Filter = "active" | "completed"

export function MyEventsSubList({ variant, title, emptyMessage }: { variant: Filter; title: string; emptyMessage: string }) {
    const dash = useMyEventsDashboard()
    const { activeEvents, completedEvents } = useMemo(() => partitionUserEvents(dash.events), [dash.events])
    const list = variant === "active" ? activeEvents : completedEvents

    return (
        <div className="font-sans pb-12">
            <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
                <div className="container mx-auto max-w-6xl px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <Link
                            href="/my-events"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to My Events
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-6 py-10 max-w-6xl">
                {dash.loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading events...</p>
                    </div>
                ) : list.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {list.map((event) => (
                            <UserActiveCompletedEventCard
                                key={event.id}
                                event={event}
                                organizerRequests={dash.organizerRequests}
                                reviewStatusByEvent={dash.reviewStatusByEvent}
                                onDelete={dash.handleDelete}
                                onOpenApplications={dash.openApplicationsModal}
                                onReviewClick={dash.setReviewDialog}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[40px] border border-slate-100 bg-slate-50/80 px-8 py-16 text-center">
                        <p className="text-slate-600 font-bold text-lg">{emptyMessage}</p>
                        <Button asChild className="mt-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
                            <Link href="/my-events">Return to dashboard</Link>
                        </Button>
                    </div>
                )}
            </main>

            <MyEventsModals
                applicationsModalEventId={dash.applicationsModalEventId}
                setApplicationsModalEventId={dash.setApplicationsModalEventId}
                applications={dash.applications}
                loadingApplications={dash.loadingApplications}
                assigningOrganizerId={dash.assigningOrganizerId}
                onAssign={dash.handleAssignOrganizer}
                reviewDialog={dash.reviewDialog}
                setReviewDialog={dash.setReviewDialog}
                onSubmitReview={dash.submitReview}
            />
        </div>
    )
}
