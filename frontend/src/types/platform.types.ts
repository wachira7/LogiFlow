// frontend/src/types/platform.types.ts

// ============================================
// PLATFORM SETTINGS
// ============================================
export interface PlatformSetting {
  id: string
  setting_key: string
  setting_value: string
  description: string
  is_active: boolean
  modified_by_email?: string
  created_at: string
  updated_at: string
}

export interface CreatePlatformSettingData {
  setting_key: string
  setting_value: string
  description?: string
  is_active?: boolean
}

export interface UpdatePlatformSettingData {
  setting_value?: string
  description?: string
  is_active?: boolean
}

// ============================================
// AUDIT LOGS
// ============================================
export type AuditAction =
  | 'COMPANY_CREATED'
  | 'COMPANY_SUSPENDED'
  | 'COMPANY_ACTIVATED'
  | 'SUBSCRIPTION_MODIFIED'
  | 'USER_IMPERSONATED'
  | 'SETTINGS_CHANGED'
  | 'SYSTEM_MAINTENANCE'

export interface PlatformAuditLog {
  id: string
  admin_user_email: string
  action: AuditAction
  target_company_name?: string
  target_user_email?: string
  description: string
  ip_address?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditLogFilters {
  action?: AuditAction
  admin_user?: string
  target_company?: string
  start_date?: string
  end_date?: string
}

export interface SecurityReport {
  total_audit_entries: number
  recent_activity_24h: number
  action_breakdown: Record<string, number>
  most_active_admins: Array<{
    admin_user__email: string
    action_count: number
  }>
  security_alerts: unknown[]
}

// ============================================
// SYSTEM HEALTH
// ============================================
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL'

export interface SystemHealthMetric {
  id: string
  metric_name: string
  metric_value: number
  metric_unit: string
  status: HealthStatus
  threshold_warning?: number
  threshold_critical?: number
  description: string
  auto_generated: boolean
  created_at: string
}

export interface SystemHealthDashboard {
  overall_status: HealthStatus
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  active_connections: number
  response_time_avg: number
  error_rate: number
  uptime_percentage: number
}

export interface CreateHealthMetricData {
  metric_name: string
  metric_value: number
  metric_unit: string
  threshold_warning?: number
  threshold_critical?: number
  description?: string
}

// ============================================
// PLATFORM NOTIFICATIONS
// ============================================
export type NotificationType = 
  | 'MAINTENANCE'
  | 'FEATURE'
  | 'SECURITY'
  | 'BILLING'
  | 'GENERAL'

export type NotificationPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'

export interface PlatformNotification {
  id: string
  title: string
  message: string
  notification_type: NotificationType
  priority: NotificationPriority
  is_global: boolean
  is_active: boolean
  is_sent: boolean
  sent_at?: string
  scheduled_for?: string
  expires_at?: string
  created_by_email?: string
  target_company_count: number
  created_at: string
  updated_at: string
}

export interface CreateNotificationData {
  title: string
  message: string
  notification_type: NotificationType
  priority: NotificationPriority
  is_global: boolean
  target_companies?: string[]
  scheduled_for?: string
  expires_at?: string
}

// ============================================
// COMPANY MANAGEMENT
// ============================================
export type CompanyAction = 
  | 'ACTIVATE'
  | 'SUSPEND'
  | 'DELETE'
  | 'RESET_TRIAL'

export interface CompanyOverview {
  company_id: string
  company_name: string
  is_active: boolean
  subscription_status: string
  user_count: number
  total_revenue: number
  last_activity: string
  created_at: string
}

export interface CompanyManagementData {
  company_id: string
  action: CompanyAction
  reason: string
  notify_users: boolean
}

export interface CompanyManagementResponse {
  message: string
  company_status: 'active' | 'suspended' | 'deleted'
}

// ============================================
// PLATFORM ANALYTICS
// ============================================
export interface MonthlyRevenue {
  month: string
  revenue: number
}

export interface RecentActivity {
  action: string
  admin: string
  description: string
  timestamp: string
}

export interface PlatformAnalytics {
  total_companies: number
  active_companies: number
  total_users: number
  active_users: number
  total_revenue: number
  monthly_revenue: MonthlyRevenue[]
  subscription_breakdown: Record<string, number>
  system_health_status: HealthStatus
  recent_activity: RecentActivity[]
}

export interface CompanyOverviewResponse {
  companies: CompanyOverview[]
  total_count: number
}

// ============================================
// FILTER & PAGINATION
// ============================================
export interface PlatformAdminFilters {
  search?: string
  is_active?: boolean
  status?: string
  page?: number
  limit?: number
  ordering?: string
}

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next?: string
  previous?: string
}

// ============================================
// DASHBOARD STATS
// ============================================
export interface DashboardStats {
  total_companies: number
  active_companies: number
  suspended_companies: number
  total_users: number
  total_revenue: number
  monthly_growth: number
  system_status: HealthStatus
  pending_issues: number
}

// ============================================
// CONSTANTS
// ============================================
export const AUDIT_ACTIONS: { value: AuditAction; label: string }[] = [
  { value: 'COMPANY_CREATED', label: 'Company Created' },
  { value: 'COMPANY_SUSPENDED', label: 'Company Suspended' },
  { value: 'COMPANY_ACTIVATED', label: 'Company Activated' },
  { value: 'SUBSCRIPTION_MODIFIED', label: 'Subscription Modified' },
  { value: 'USER_IMPERSONATED', label: 'User Impersonated' },
  { value: 'SETTINGS_CHANGED', label: 'Settings Changed' },
  { value: 'SYSTEM_MAINTENANCE', label: 'System Maintenance' },
]

export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'FEATURE', label: 'New Feature' },
  { value: 'SECURITY', label: 'Security Update' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'GENERAL', label: 'General' },
]

export const NOTIFICATION_PRIORITIES: { value: NotificationPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'blue' },
  { value: 'MEDIUM', label: 'Medium', color: 'yellow' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'CRITICAL', label: 'Critical', color: 'red' },
]

export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  HEALTHY: 'green',
  WARNING: 'yellow',
  CRITICAL: 'red',
}
