export type Condition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Needs Repair'
export type CheckoutStatus = 'Out' | 'Returned'

export const CATEGORIES = [
  'Power Tools',
  'Hand Tools',
  'Measuring & Layout',
  'Electrical',
  'Plumbing',
  'Air Tools',
  'Fastening',
  'Concrete & Masonry',
  'Lifting & Material Handling',
  'Safety Equipment',
  'Storage & Organization',
  'Other',
] as const

export const CONDITIONS: Condition[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair']

export interface Tool {
  id: string
  name: string
  brand: string
  model: string
  category: string
  condition: Condition
  quantity_total: string
  quantity_available: string
  location: string
  reorder_threshold: string
  last_used_date: string
  date_added: string
  notes: string
  serial_number: string
  purchase_date: string
  purchase_price: string
  expected_life_years: string
  ai_description: string
}

export interface ToolAnalysis {
  name: string
  brand: string
  model: string
  category: string
  condition: Condition
  serial_number: string
  description: string
  suggested_life_years: number
}

export interface Checkout {
  id: string
  tool_id: string
  tool_name: string
  crew_member: string
  date_out: string
  date_in: string
  job_project: string
  notes: string
  status: CheckoutStatus
}

export type AlertType = 'maintenance' | 'replacement' | 'low_stock'
export type AlertSeverity = 'high' | 'medium' | 'low'

export interface Alert {
  type: AlertType
  tool_id: string
  tool_name: string
  message: string
  severity: AlertSeverity
}

export interface DashboardData {
  stats: {
    total_tools: number
    active_checkouts: number
    alerts_count: number
  }
  alerts: Alert[]
  active_checkouts: Checkout[]
  recent_activity: Checkout[]
}
