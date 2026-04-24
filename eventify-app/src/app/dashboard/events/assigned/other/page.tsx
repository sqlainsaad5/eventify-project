import { DashboardLayout } from "@/components/dashboard-layout"
import { AssignedSubPage } from "../../_components/assigned-sub-page"

export default function AssignedOtherPage() {
  return (
    <DashboardLayout>
      <AssignedSubPage
        title="Other assignments"
        filter="other"
        basePath="/dashboard/events/assigned/other"
        emptyMessage="No other assignment records to show."
      />
    </DashboardLayout>
  )
}
