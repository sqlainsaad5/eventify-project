"use client"

import { Suspense, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Loader2, Plus, Target, ArrowRight } from "lucide-react"
import { useMyEventsDashboard } from "./_lib/use-my-events-dashboard"
import { partitionUserEvents } from "./_lib/partition-user-events"
import { MY_EVENTS_PREVIEW_LIMIT } from "./_lib/constants"
import { UserActiveCompletedEventCard, UserCanceledEventCard } from "./_components/user-event-cards"
import { MyEventsModals } from "./_components/my-events-modals"

function ApplicationsQueryHandler({ onOpen }: { onOpen: (id: number) => void }) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const lastQuery = useRef<string | null>(null)
    useEffect(() => {
        const q = searchParams.get("applications")
        if (!q) {
            lastQuery.current = null
            return
        }
        if (lastQuery.current === q) return
        lastQuery.current = q
        const id = parseInt(q, 10)
        if (!Number.isFinite(id) || id <= 0) {
            router.replace("/my-events", { scroll: false })
            return
        }
        void onOpen(id)
        router.replace("/my-events", { scroll: false })
    }, [searchParams, router, onOpen])
    return null
}

function MyEventsPageContent() {
    const dash = useMyEventsDashboard()
    const { activeEvents, completedEvents, canceledEvents } = useMemo(
        () => partitionUserEvents(dash.events),
        [dash.events]
    )

    const activePreview = activeEvents.slice(0, MY_EVENTS_PREVIEW_LIMIT)
    const completedPreview = completedEvents.slice(0, MY_EVENTS_PREVIEW_LIMIT)
    const showActiveViewAll = activeEvents.length > MY_EVENTS_PREVIEW_LIMIT
    const showCompletedViewAll = completedEvents.length > MY_EVENTS_PREVIEW_LIMIT

    return (
        <div className="font-sans pb-8">
            <ApplicationsQueryHandler onOpen={dash.openApplicationsModal} />
            <div
                className="py-16 text-center text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)" }}
            >
                <div className="relative z-10 container mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">My Added Events</h1>
                    <p className="text-lg text-white/70 font-medium max-w-xl mx-auto mb-6">
                        Review and manage the personal visions you&apos;ve shared with us.
                    </p>
                    <Link href="/my-events/event-details">
                        <Button className="bg-white text-indigo-600 hover:bg-white/90 font-black rounded-2xl h-12 px-6 shadow-xl gap-2">
                            <Plus className="h-5 w-5" />
                            Create Event
                        </Button>
                    </Link>
                </div>
            </div>

            <main className="container mx-auto px-6 py-12 max-w-6xl">
                {!dash.loading && dash.events.length > 0 && (
                    <div className="flex justify-end mb-6">
                        <Link href="/my-events/event-details">
                            
                        </Link>
                    </div>
                )}
                {dash.loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Retrieving your visions...</p>
                    </div>
                ) : dash.events.length > 0 ? (
                    <div className="space-y-16">
                        {activeEvents.length > 0 && (
                            <section className="space-y-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Active events</h2>
                                    {showActiveViewAll && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="rounded-xl font-black uppercase tracking-widest text-[10px] border-slate-200 shrink-0"
                                        >
                                            <Link href="/my-events/active" className="inline-flex items-center gap-2">
                                                View All
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {activePreview.map((event) => (
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
                            </section>
                        )}
                        {completedEvents.length > 0 && (
                            <section className="space-y-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Completed events</h2>
                                    {showCompletedViewAll && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="rounded-xl font-black uppercase tracking-widest text-[10px] border-slate-200 shrink-0"
                                        >
                                            <Link href="/my-events/completed" className="inline-flex items-center gap-2">
                                                View All
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {completedPreview.map((event) => (
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
                            </section>
                        )}
                        {canceledEvents.length > 0 && (
                            <section className="space-y-6">
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Canceled events</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {canceledEvents.map((event) => (
                                        <UserCanceledEventCard key={event.id} event={event} onDelete={dash.handleDelete} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[60px] shadow-2xl shadow-slate-100 border border-slate-50">
                        <div className="h-24 w-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mb-8 rotate-3">
                            <Calendar className="h-12 w-12 text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Your vision board is empty.</h3>
                        <p className="text-slate-500 mt-3 max-w-sm text-center font-bold text-lg leading-relaxed">
                            Start by sharing your event details with us. We&apos;ll show them here.
                        </p>
                        <Link href="/my-events/event-details" className="mt-10">
                            <Button className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-black shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                                <Target className="h-6 w-6" /> Share Event Vision
                            </Button>
                        </Link>
                    </div>
                )}
            </main>

            <MyEventsModals
                applicationsModalEventId={dash.applicationsModalEventId}
                setApplicationsModalEventId={dash.setApplicationsModalEventId}
                applications={dash.applications}
                loadingApplications={dash.loadingApplications}
                assigningOrganizerId={dash.assigningOrganizerId}
                decliningOrganizerId={dash.decliningOrganizerId}
                applicationOrganizerSummaries={dash.applicationOrganizerSummaries}
                onAssign={dash.handleAssignOrganizer}
                onDecline={dash.handleDeclineApplication}
                reviewDialog={dash.reviewDialog}
                setReviewDialog={dash.setReviewDialog}
                onSubmitReview={dash.submitReview}
            />
        </div>
    )
}

export default function MyEventsPage() {
    return (
        <Suspense
            fallback={
                <div className="font-sans pb-8 min-h-[40vh] flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                </div>
            }
        >
            <MyEventsPageContent />
        </Suspense>
    )
}
