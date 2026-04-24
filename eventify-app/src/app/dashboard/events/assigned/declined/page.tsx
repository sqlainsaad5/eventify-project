import { DashboardLayout } from "@/components/dashboard-layout"
import { AssignedSubPage } from "../../_components/assigned-sub-page"

export default function AssignedDeclinedPage() {
  return (
    <DashboardLayout>
      <AssignedSubPage
        title="Declined assignments"
        filter="declined"
        basePath="/dashboard/events/assigned/declined"
        emptyMessage="You have no declined assignments in this list."
      />
    </DashboardLayout>
  )
}
