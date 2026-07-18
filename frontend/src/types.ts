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
  description?: string
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
  id: number
  stage: string
  status: string
  started_at: string
  ended_at?: string
  days: number
  note?: string
  responsible_name?: string
  supplier_name?: string
}

export type FabricRequest = {
  id: number
  reference: string
  article?: string
  composition?: string
  width?: string
  grammage?: string
  color?: string
  quantity_meters?: number
  price_per_meter?: number
  leadtime?: string
  notes?: string
  cover_url?: string
  status: string
  supplier_id?: number
  supplier_name?: string
  development_id?: number
  development_code?: string
  requested_at: string
  received_at?: string
  labels: Label[]
  days_pending?: number
  days_to_receive?: number
  needs_reminder: boolean
}

export type DevelopmentDetail = Development & {
  stage_history: StageHistoryItem[]
  estimated_completion?: string
  eta_at_risk: boolean
  comments: CommentItem[]
  fabric_requests: FabricRequest[]
  productions: LinkedProduction[]
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
  total_developments?: number
  cancel_rate?: number
  tastes?: string[]
  avoids?: string[]
  fabric_total?: number
  fabric_avg_days?: number | null
  fabric_cancel_rate?: number
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
  development_id?: number
  development_code?: string
  title?: string
  client_id?: number
  client_name: string
  quantity: number
  status: string
  due_date?: string
  responsible_name?: string
  description?: string
}

export type ProductionDetail = Production & {
  stage_history: StageHistoryItem[]
  comments: CommentItem[]
  development?: { id: number; code: string; title: string; current_stage: string } | null
  fabric_requests: FabricRequest[]
}

export type LinkedProduction = { id: number; status: string; quantity: number; due_date?: string; title?: string }

export type StageStat = { stage: string; label: string; average_days?: number; completed_events: number }
