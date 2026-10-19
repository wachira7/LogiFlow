// src/types/analytics.types.ts
// Shape of GET /api/v1/analytics/report/?days=7|30|90

export type Period = 7 | 30 | 90

/** A figure for the period with the same figure for the previous period; change is % or null. */
export interface Metric {
  value: number
  previous: number
  change: number | null
}

/** Averages/rates: null when there was nothing to average. */
export interface Rate {
  value: number | null
  previous: number | null
}

export interface AnalyticsReport {
  period: { days: Period; start: string; end: string; previous_start: string }
  currency: string
  distribution: {
    orders: Metric
    revenue: Metric
    deliveries: Metric
    on_time_rate: Rate
    avg_delivery_days: Rate
    orders_by_status: Record<string, number>
    open_shipments: number
    top_customers: { name: string; orders: number; revenue: number }[]
  }
  inventory: {
    stock_value: number
    stock_units: number
    products: number
    low_stock: number
    movements: Metric
    units_in: number
    units_out: number
    movements_by_type: Record<string, number>
    by_warehouse: { name: string; units: number; value: number }[]
    top_products_by_value: { name: string; sku: string; units: number; value: number }[]
    low_stock_items: { name: string; sku: string; warehouse: string; quantity: number; reorder_point: number }[]
  }
  production: {
    runs_completed: Metric
    units_produced: Metric
    avg_cycle_hours: Rate
    in_progress: number
    planned: number
    overdue: number
    top_products: { name: string; units: number; runs: number }[]
    materials_used: { name: string; units: number }[]
  }
  warehousing: {
    transfers_completed: Metric
    units_moved: Metric
    avg_transfer_days: Rate
    in_transit: number
    pending: number
    routes: { from: string; to: string; transfers: number; units: number }[]
  }
  series: {
    dates: string[]
    orders: number[]
    revenue: number[]
    deliveries: number[]
    units_produced: number[]
    stock_in: number[]
    stock_out: number[]
    transfers: number[]
  }
  generated_at: string
}
