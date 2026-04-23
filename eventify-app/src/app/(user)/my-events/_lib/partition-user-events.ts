import type { UserDashboardEvent } from "./types"

export function partitionUserEvents(events: UserDashboardEvent[]) {
    const active: UserDashboardEvent[] = []
    const completed: UserDashboardEvent[] = []
    const canceled: UserDashboardEvent[] = []
    for (const e of events) {
        const s = e.status || ""
        if (s === "completed") completed.push(e)
        else if (s === "canceled" || s === "cancelled") canceled.push(e)
        else active.push(e)
    }
    return { activeEvents: active, completedEvents: completed, canceledEvents: canceled }
}

export function statusLabel(status?: string) {
    switch (status) {
        case "awaiting_organizer_confirmation":
            return "Awaiting Organizer Confirmation"
        case "pending_advance_payment":
            return "Awaiting 25% Advance Payment"
        case "advance_payment_completed":
            return "25% Advance Paid"
        case "vendor_assigned":
            return "Vendor Assigned"
        case "completed":
            return "Event Completed"
        case "canceled":
        case "cancelled":
            return "Canceled"
        case "created":
            return "Created"
        default:
            return status ? status.replace(/_/g, " ") : "Created"
    }
}

export function organizerAdvanceLabel(status?: string) {
    switch (status) {
        case "pending":
            return "Advance 25% requested"
        case "paid":
            return "Advance 25% paid"
        case "rejected":
            return "Advance 25% rejected"
        default:
            return status || ""
    }
}
