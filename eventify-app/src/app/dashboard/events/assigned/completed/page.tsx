import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { OrganizerCompletedAssignedViewAll } from "../../_components/organizer-completed-assigned-view-all"
import { Loader2 } from "lucide-react"

function ViewAllFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4 font-sans">
      <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading…</p>
    </div>
  )
}

export default function AssignedCompletedPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<ViewAllFallback />}>
        <OrganizerCompletedAssignedViewAll />
      </Suspense>
    </DashboardLayout>
  )
}
