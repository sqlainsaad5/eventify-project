export const MY_EVENTS_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface UserDashboardEvent {
    id: number
    name: string
    date: string
    venue: string
    budget: number
    progress: number
    vendor_category: string
    image_url?: string
    organizer_id?: number | null
    organizer_name?: string | null
    organizer_status?: string
    status?: string
    application_count?: number
}

export interface EventReviewStatus {
    can_review_organizer: boolean
    my_user_to_organizer: Record<string, unknown> | null
}

export interface EventApplicationRow {
    id: number
    event_id: number
    organizer_id: number
    organizer_name: string | null
    organizer_email: string | null
    message: string | null
    status: string
    created_at: string | null
}

export interface OrganizerRequest {
    id: number
    event_id: number
    status: string
}
