// types/dashboard.types.ts
export interface DashboardUser {
  id: string
  name: string
  email: string
  role: string
  joined_at: string
}

export interface DashboardCompany {
  id: string
  name: string
  industry: string
  created_at: string
  logo?: string
  email: string
  currency?: string
}

export interface DashboardStats {
  total_users: number
  total_products: number
  pending_orders: number
  active_shipments: number
  days_active: number
  stock_units: number
  stock_value: number
  low_stock_items: number
  transfers_in_transit: number
  transfers_pending: number
  production_in_progress: number
  production_planned: number
}

export interface ActivityItem {
  id: number
  type: 'user_joined' | 'company_created' | 'product_added' | 'order_created' | 'stock_movement' | 'production_completed' | 'transfer_completed'
  message: string
  timestamp: string
  user: {
    name: string
    email: string
  }
  href?: string
}

export interface TrendPoint {
  date: string
  orders: number
  units_produced: number
  stock_movements: number
  deliveries: number
}

export interface QuickAction {
  id: number
  title: string
  description: string
  icon: string
  href: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow'
}

export interface SetupStep {
  id: number
  title: string
  completed: boolean
  description: string
}

export interface SetupProgress {
  completed_steps: number
  total_steps: number
  steps: SetupStep[]
}

export interface PerformanceMetric {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  description: string
}

export interface Alert {
  id: number
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  timestamp: string
  action: string
  href?: string
}
export interface DashboardOverview {
  company: DashboardCompany
  user: DashboardUser
  stats: DashboardStats
  recent_activity: ActivityItem[]
  quick_actions: QuickAction[]
  setup_progress: SetupProgress
  performance_metrics: PerformanceMetric[]
  alerts: Alert[]
  trend: TrendPoint[]
  ops: OpsToday
  generated_at: string
}

export interface OpsToday {
  in_flight: number
  out_for_delivery: number
  late: number
  delivered_today: number
  on_time_today: number | null
  open_exceptions: number
  urgent_exceptions: number
  unassigned_exceptions: number
  routes_running: number
  routes: { id: string; name: string; driver: string | null; vehicle: string | null; done: number; total: number; started_at: string | null }[]
  live_units: { id: string; label: string; latitude: number; longitude: number; heading: number | null; recorded_at: string }[]
}
