export type Label = { id: number; name: string; tone: string }

export type User = { id: number; name: string; email: string; role: string }
export type TeamUser = User & { is_active: boolean; created_at: string }

export type Development = {
  id: number
  code: string
  title: string
  client_id: number
  client_name: string
  owner_name: string
  cover_url?: string
  current_stage: string
  status: string
  waiting_reason?: string
  due_date?: string
  estimated_value?: number
  created_at: string
  updated_at: string
  days_in_stage: number
  next_action: string
  risk: 'low' | 'medium' | 'high'
  suggestions: string[]
  labels: Label[]
  comments_count: number
  production_quantity?: number
  priority?: number
}

export type CommentItem = { id: number; author: string; body: string; category: string; created_at: string }

export type StageHistoryItem = {
  stage: string
  status: string
  started_at: string
  ended_at?: string
  days: number
  note?: string
  supplier_name?: string
}

export type DevelopmentDetail = Development & {
  stage_history: StageHistoryItem[]
  estimated_completion?: string
  eta_at_risk: boolean
  comments: CommentItem[]
}

export type Client = { id: number; name: string; group_name?: string }
export type Supplier = { id: number; name: string; category: string }
export type Score = {
  client_id?: number
  supplier_id?: number
  name: string
  grade: string
  score: number
  summary: string
  approval_rate?: number
  on_time_rate?: number
  average_versions?: number
  average_delay_days?: number
  active_requests?: number
}

export type ShoppingPurchase = {
  id: number
  brand: string
  reference?: string
  amount: number
  purchase_date: string
  return_deadline?: string
  status: string
  invoice_number?: string
  credit_note_number?: string
  refund_received: boolean
  cover_url?: string
  days_to_return?: number
}

export type Production = {
  id: number
  development_id: number
  development_code: string
  client_name: string
  quantity: number
  status: string
  due_date?: string
  responsible_name?: string
}

export type StageStat = { stage: string; label: string; average_days?: number; completed_events: number }
