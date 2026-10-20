// src/services/adminService.ts
// Platform admin API (platform admins only).
import { api } from './api'

export interface AdminOverview {
  total_companies: number
  active_companies: number
  suspended_companies: number
  engaged_companies_30d: number
  new_companies_30d: number
  total_users: number
  active_users: number
  users_signed_in_30d: number
  revenue_total: Record<string, number>
  revenue_30d: Record<string, number>
  mrr_usd: number
  paying_subscriptions: number
  trials: number
  churned_30d: number
  subscription_breakdown: Record<string, number>
  plan_breakdown: { plan: string; cycle: string; count: number }[]
  monthly: { month: string; revenue: Record<string, number>; signups: number }[]
  recent_activity: { action: string; admin: string; description: string; timestamp: string; company: string | null }[]
}

export interface CompanyRow {
  company_id: string
  company_name: string
  email: string
  industry: string
  is_active: boolean
  subscription_status: string
  plan_name: string | null
  owner_email: string | null
  user_count: number
  last_activity: string
  created_at: string
}

export interface CompanyDetail {
  id: string
  name: string
  email: string
  phone: string
  industry: string
  company_size: string
  address: string
  website: string
  is_active: boolean
  created_at: string
  currency: string
  timezone: string
  users: { id: string; name: string; email: string; role: string; is_active: boolean; last_login: string | null; date_joined: string }[]
  subscriptions: { id: string; plan: string; cycle: string; status: string; provider: string; start_date: string; end_date: string; is_trial: boolean; auto_renew: boolean }[]
  payments: { id: string; amount: number; currency: string; status: string; provider: string; description: string; created_at: string }[]
  paid_total: Record<string, number>
  usage: Record<string, number>
  admin_history: { action: string; description: string; admin: string; timestamp: string }[]
}

export type HealthStatus = 'ok' | 'warn' | 'fail'
export interface Health {
  overall_status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  checks: { key: string; label: string; status: HealthStatus; detail: string; latency_ms: number }[]
  providers: { key: string; label: string; configured: boolean; mode: string | null; webhook: boolean | null }[]
  signals: { failed_payments_24h: number; stuck_pending_payments: number; past_due_subscriptions: number }
  runtime: { python: string; django: string; debug: boolean; process_uptime_seconds: number; release: string | null }
  checked_at: string
}

export interface AuditEntry {
  id: string
  admin_user_email: string
  action: string
  target_company_name: string | null
  description: string
  ip_address: string | null
  created_at: string
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  notification_type: 'MAINTENANCE' | 'FEATURE' | 'SECURITY' | 'BILLING' | 'GENERAL'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  is_global: boolean
  is_active: boolean
  scheduled_for: string | null
  expires_at: string | null
  is_sent: boolean
  sent_at: string | null
  created_by_email: string
  target_company_count: number
  target_company_ids: string[]
  target_company_names: string[]
  created_at: string
}

export interface PlatformSetting {
  id: string
  setting_key: string
  setting_value: string
  description: string
  is_active: boolean
  modified_by_email: string | null
  updated_at: string
}

export type CompanyAction = 'ACTIVATE' | 'SUSPEND' | 'EXTEND_TRIAL' | 'DELETE'

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}
const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []))
const B = '/api/v1/platform-admin'

export const adminService = {
  overview: async () => unwrap(await api.get<AdminOverview>(`${B}/analytics/overview/`)),
  companies: async (search = '', status = '') =>
    unwrap(await api.get<{ companies: CompanyRow[]; total_count: number }>(`${B}/analytics/company_overview/`, { search, status })).companies,
  company: async (id: string) => unwrap(await api.get<CompanyDetail>(`${B}/analytics/company_detail/`, { company_id: id })),
  manageCompany: async (companyId: string, action: CompanyAction, reason: string, extra: { days?: number; confirm_name?: string; notify_users?: boolean } = {}) =>
    unwrap(await api.post<{ message: string; company_status: string }>(`${B}/analytics/manage_company/`, { company_id: companyId, action, reason, ...extra })),

  health: async () => unwrap(await api.get<Health>(`${B}/system-health/dashboard/`)),

  auditLogs: async (filters: { search?: string; action?: string } = {}) => list<AuditEntry>(unwrap(await api.get(`${B}/audit-logs/`, filters))),

  notifications: async () => list<AdminNotification>(unwrap(await api.get(`${B}/notifications/`))),
  createNotification: async (data: Partial<AdminNotification>) => unwrap(await api.post<AdminNotification>(`${B}/notifications/`, data)),
  updateNotification: async (id: string, data: Partial<AdminNotification>) => unwrap(await api.patch<AdminNotification>(`${B}/notifications/${id}/`, data)),
  publishNotification: async (id: string) => unwrap(await api.post<{ message: string }>(`${B}/notifications/${id}/send_now/`)),
  deleteNotification: async (id: string) => unwrap(await api.delete(`${B}/notifications/${id}/`)),

  settings: async () => list<PlatformSetting>(unwrap(await api.get(`${B}/settings/`))),
  saveSetting: async (data: Partial<PlatformSetting>, id?: string) =>
    unwrap(id ? await api.patch<PlatformSetting>(`${B}/settings/${id}/`, data) : await api.post<PlatformSetting>(`${B}/settings/`, data)),
  deleteSetting: async (id: string) => unwrap(await api.delete(`${B}/settings/${id}/`)),
}
