import { DashboardLayout } from "@/components/dashboard-layout"
import { AssignedSubPage } from "../../_components/assigned-sub-page"

export default function AssignedPendingPage() {
  return (
    <DashboardLayout>
      <AssignedSubPage
        title="Awaiting your approval"
        filter="pending"
        basePath="/dashboard/events/assigned/pending"
        emptyMessage="You have no pending assignment requests."
      />
    </DashboardLayout>
  )
}
