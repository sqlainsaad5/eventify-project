export interface DashboardEvent {
  id: number
  name: string
  date: string
  venue: string
  budget: number
  progress: number
  vendor_category: string
  image_url?: string
  organizer_status?: string
  user_id?: number
  organizer_id?: number | null
  status?: string
  organizer_advance_paid?: boolean
  organizer_final_paid?: boolean
  completed_vendors?: { id: number; name: string }[]
  /** ISO; used for "recent" ordering (newest first) */
  created_at?: string | null
  updated_at?: string | null
}

export interface AssignedReviewStatus {
  my_organizer_to_vendor: Record<string, Record<string, unknown> | null>
  can_review_vendor_ids: number[]
}
