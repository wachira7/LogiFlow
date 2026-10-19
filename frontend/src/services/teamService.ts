// src/services/teamService.ts
// Company profile, team, invitations and company settings (owners edit; members read).
import { api } from './api'

export type Role = 'company_owner' | 'warehouse_manager' | 'production_manager' | 'logistics_coordinator' | 'inventory_manager' | 'driver' | 'member'

export const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'company_owner', label: 'Owner', hint: 'Everything, including billing and the team' },
  { value: 'warehouse_manager', label: 'Warehouse manager', hint: 'Warehouses, stock and transfers' },
  { value: 'production_manager', label: 'Production manager', hint: 'Production orders and the work queue' },
  { value: 'logistics_coordinator', label: 'Logistics coordinator', hint: 'Orders, shipments and routes' },
  { value: 'inventory_manager', label: 'Inventory manager', hint: 'Products and stock levels' },
  { value: 'driver', label: 'Driver', hint: 'Deliveries assigned to them' },
  { value: 'member', label: 'Member', hint: 'General access' },
]

export const roleLabel = (role?: string) => ROLES.find((r) => r.value === role)?.label ?? 'Member'

export interface CompanyInfo {
  id: string
  name: string
  slug: string
  logo: string | null
  address: string
  phone: string
  email: string
  website: string
  industry: string
  company_size: string
  timezone: string
  users_count: number
  subscription_status: string | null
  subscription_plan: string | null
  seats_used: number
  seats_limit: number | null
  currency: string
  created_at: string
}

export interface Member {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number: string
  profile_picture: string | null
  role: Role
  is_active: boolean
  is_you: boolean
  date_joined: string
  last_login: string | null
}

export interface PendingInvitation {
  id: string
  email: string
  role: string
  invitation_url: string
  invited_by_name: string
  expires_at: string
  is_expired: boolean
  status: 'pending' | 'expired' | 'accepted'
  created_at: string
  email_sent?: boolean
}

export interface CompanySettingsData {
  timezone: string
  currency: string
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  time_format: '12h' | '24h'
  language: string
  fiscal_year_start: string
  working_days: string[]
  working_hours_start: string
  working_hours_end: string
  session_timeout: number
  email_notifications: boolean
}

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}
const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []))

const T = '/api/v1/tenants'

export const teamService = {
  company: async () => unwrap(await api.get<CompanyInfo>(`${T}/company/`)),
  updateCompany: async (data: Partial<CompanyInfo>) => unwrap(await api.patch<CompanyInfo>(`${T}/company/`, data)),
  uploadLogo: async (file: File) => unwrap(await api.upload<{ logo_url: string }>(`${T}/company/logo/`, file, 'logo')),

  members: async () => list<Member>(unwrap(await api.get(`${T}/members/`, { page_size: 200 }))),
  updateMember: async (id: string, data: { role?: Role; is_active?: boolean }) => unwrap(await api.patch<Member>(`${T}/members/${id}/`, data)),

  invitations: async () => list<PendingInvitation>(unwrap(await api.get(`${T}/invitations/`, { page_size: 100 }))),
  invite: async (email: string, role: Role, message?: string) =>
    unwrap(await api.post<PendingInvitation>(`${T}/invitations/`, { email, role, ...(message ? { message } : {}) })),
  resend: async (id: string) => unwrap(await api.post<{ message: string; email_sent: boolean; invitation_url: string }>(`${T}/invitations/${id}/resend/`, {})),
  revoke: async (id: string) => unwrap(await api.delete(`${T}/invitations/${id}/revoke/`)),

  settings: async () => unwrap(await api.get<CompanySettingsData>(`${T}/settings/`)),
  updateSettings: async (data: Partial<CompanySettingsData>) => unwrap(await api.patch<CompanySettingsData>(`${T}/settings/`, data)),
}
