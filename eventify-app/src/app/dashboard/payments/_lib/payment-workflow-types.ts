export type PaymentWorkflowCategory = "event_funding" | "vendor_payout" | "organizer_fee"

export interface Payment {
  id: number
  event_id: number
  amount: number
  currency: string
  status: string
  payment_method: string
  transaction_id: string
  payment_date: string
  created_at: string
  event_name: string
  /** From API: vendor row when the payment settled a vendor */
  vendor_id?: number | null
  payment_type?: string | null
  /** From API: event funding, vendor payout, or organizer fee (Stripe) */
  workflow_category?: PaymentWorkflowCategory
  vendor_name?: string | null
}

export interface Event {
  id: number
  name: string
  budget: number
  payment_status: "unpaid" | "deposit_paid" | "partially_paid" | "fully_paid"
  deposit_amount?: number
  vendor_payments_total?: number
  total_spent?: number
  organizer_id?: number | null
  organizer_advance_paid?: boolean
  organizer_final_requested?: boolean
  organizer_final_paid?: boolean
  status?: string
  user_id?: number
  created_at?: string
}

export interface PaymentRequest {
  id: number
  event_id: number
  vendor_id: number
  vendor_name: string
  amount: number
  status: "pending" | "approved" | "rejected" | "paid"
  description: string
  created_at: string
  event_name: string
}

export interface OrganizerPaymentRequest {
  id: number
  event_id: number
  event_name: string
  organizer_id: number
  organizer_name: string
  amount: number
  currency: string
  description: string
  status: "pending" | "paid" | "rejected"
  created_at: string
  paid_at: string | null
}

export interface AppNotification {
  id: number
  is_read: boolean
  extra_data?: {
    action?: string
    category?: string
  }
}
