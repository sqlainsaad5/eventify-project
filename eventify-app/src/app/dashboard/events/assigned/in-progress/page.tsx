import { DashboardLayout } from "@/components/dashboard-layout"
import { AssignedSubPage } from "../../_components/assigned-sub-page"

export default function AssignedInProgressPage() {
  return (
    <DashboardLayout>
      <AssignedSubPage
        title="Active projects"
        filter="accepted"
        basePath="/dashboard/events/assigned/in-progress"
        emptyMessage="You have no active approved projects right now."
      />
    </DashboardLayout>
  )
}
