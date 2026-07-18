export type Label = { id: number; name: string; tone: string }

export type User = { id: number; name: string; email?: string; role: string; initials?: string }
export type TeamUser = User & { is_active: boolean; created_at: string; phone?: string }
export type DevelopmentAssignee = { id: number; user_id: number; name: string; role: string }
export type DevelopmentTask = {
  id: number; kind: string; status: string; note?: string; due_date?: string
  responsible_user_id?: number; responsible_name?: string; completed_at?: string
}

export type Development = {
  id: number
  code: string
  title: string
  client_id: number
  client_name: string
  owner_name: string
  cover_url?: string
  images: string[]
  request_source?: string
  request_group?: string
  requested_quantity?: number
  request_notes?: string
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
  assignees: DevelopmentAssignee[]
  tasks: DevelopmentTask[]
  open_tasks_count: number
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
  request_channel?: string
  stock_status: string
  requested_by?: string
  requested_to?: string
  treatment_notes?: string
  attachments: { url: string; mime_type: string; name: string }[]
  cover_url?: string
  status: string
  supplier_id?: number
  supplier_name?: string
  development_id?: number
  development_code?: string
  developments: { link_id?: number; id: number; code: string; title: string; relation_type: string }[]
  requested_at: string
  supplier_confirmed_at?: string
  expected_at?: string
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

export type Client = {
  id: number; name: string; code?: string; group_name?: string; notes?: string
  email?: string; phone?: string; contact_person?: string; segments?: string; preferred_channel?: string; meetings?: string
}
export type Supplier = {
  id: number; name: string; category: string; email?: string; phone?: string
  contact_person?: string; preferred_channel?: string; meetings?: string; notes?: string
}
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
  invoice_sent: boolean
  credit_note_sent: boolean
  notes?: string
  development_id?: number
  attachments: { url: string; mime_type: string; name: string }[]
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
  used_fabrics: (FabricRequest & { link_id: number; usage_status: string; usage_note?: string })[]
}

export type LinkedProduction = {
  id: number; status: string; quantity: number; due_date?: string; title?: string
  created_at: string; stage_history: StageHistoryItem[]
}

export type StageStat = { stage: string; label: string; average_days?: number; completed_events: number }
