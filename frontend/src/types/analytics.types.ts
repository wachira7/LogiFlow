// src/types/analytics.types.ts

// ============================================================================
// WAREHOUSING ANALYTICS TYPES
// ============================================================================

export interface StockMovement {
  source_warehouse: string;
  destination_warehouse: string;
  transfer_count: number;
  total_items: number;
  total_value: number;
}

export interface StockMovementsReport {
  stock_movements: StockMovement[];
  total_movement_pairs: number;
}

export interface WarehousingDashboard {
  total_transfers: number;
  pending_transfers: number;
  in_transit_transfers: number;
  completed_transfers: number;
  cancelled_transfers: number;
  monthly_transfers: number;
  monthly_completed: number;
  average_transfer_days: number;
  in_transit_value: number;
}

// ============================================================================
// PRODUCTION ANALYTICS TYPES
// ============================================================================

export interface MaterialRequirement {
  product_id: string;
  product_name: string;
  product_sku: string;
  required_quantity: number;
  available_stock: number;
  shortage: number;
}

export interface MaterialRequirementsReport {
  material_requirements: MaterialRequirement[];
  total_materials: number;
  materials_with_shortage: number;
}

export interface ProductionDashboard {
  total_orders: number;
  planned_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  overdue_orders: number;
  monthly_completed: number;
}

// ============================================================================
// PLATFORM ADMIN ANALYTICS TYPES
// ============================================================================

export interface CompanyOverviewItem {
  company_id: string;
  company_name: string;
  is_active: boolean;
  subscription_status: string;
  user_count: number;
  total_revenue: number;
  last_activity: string;
  created_at: string;
}

export interface CompanyOverviewReport {
  companies: CompanyOverviewItem[];
  total_count: number;
}

export interface ActionBreakdown {
  company_created: number;
  company_suspended: number;
  company_activated: number;
  subscription_modified: number;
  user_impersonated: number;
  settings_changed: number;
  system_maintenance: number;
}

export interface SecurityReport {
  total_audit_entries: number;
  recent_activity_24h: number;
  action_breakdown: ActionBreakdown;
  most_active_admins: string[];
  security_alerts: string[];
}

export interface SystemHealthDashboard {
  overall_status: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time_avg: number;
  error_rate: number;
  uptime_percentage: number;
}

// ============================================================================
// PAYMENTS/FINANCIAL ANALYTICS TYPES
// ============================================================================

export interface SubscriptionsDashboard {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  total_revenue: number;
  monthly_revenue: number;
  next_billing_date: string | null;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface ProviderRevenue {
  stripe: number;
  mpesa: number;
  crypto: number;
}

export interface RevenueReport {
  total_revenue: number;
  provider_revenue: ProviderRevenue;
  monthly_revenue: MonthlyRevenue[];
  transaction_count: number;
}

// ============================================================================
// INVENTORY ANALYTICS TYPES
// ============================================================================

export interface StockReport {
  total_products: number;
  active_products: number;
  inactive_products: number;
  low_stock_products: number;
  total_stock_value: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  reorder_point: number;
  category: string;
}

// ============================================================================
// DISTRIBUTION ANALYTICS TYPES
// ============================================================================

export interface TrackingReport {
  pending_shipments: number;
  picked_shipments: number;
  packed_shipments: number;
  shipped_shipments: number;
  delivered_shipments: number;
  delayed_shipments: number;
  average_delivery_days: number;
}

export interface DistributionDashboard {
  total_orders: number;
  new_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  monthly_orders: number;
  monthly_revenue: number;
}

// ============================================================================
// AUTH/DASHBOARD OVERVIEW TYPES
// ============================================================================

export interface CompanyInfo {
  id: string;
  name: string;
  industry: string;
  created_at: string;
  logo: string;
  email: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_products: number;
  pending_orders: number;
  active_shipments: number;
  days_active: number;
}

export interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

export interface SetupStep {
  id: number;
  title: string;
  completed: boolean;
  description: string;
}

export interface SetupProgress {
  completed_steps: number;
  total_steps: number;
  steps: SetupStep[];
}

export interface DashboardOverview {
  company: CompanyInfo;
  user: UserInfo;
  stats: DashboardStats;
  recent_activity: unknown[];
  quick_actions: QuickAction[];
  setup_progress: SetupProgress;
}

// ============================================================================
// COMBINED ANALYTICS TYPES
// ============================================================================

export interface AnalyticsSummary {
  inventory: StockReport;
  distribution: DistributionDashboard;
  production: ProductionDashboard;
  warehousing: WarehousingDashboard;
  financial: RevenueReport;
  subscriptions: SubscriptionsDashboard;
}

export interface ModuleAnalytics {
  name: string;
  metrics: Record<string, number>;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AnalyticsApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
