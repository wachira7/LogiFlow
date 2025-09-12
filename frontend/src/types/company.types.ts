// types/company.types.ts

export interface Company {
  id: string
  name: string
  industry: string
  email: string
  logo?: string
  description?: string
  website?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  created_at: string
  updated_at: string
  user_count: number
  subscription_status?: 'active' | 'inactive' | 'trial' | 'suspended'
}

export interface UpdateCompanyData {
  name?: string
  industry?: string
  email?: string
  description?: string
  website?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  logo?: File | string 
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  name: string
  role: UserRole
  is_active: boolean
  date_joined: string
  last_login?: string
  avatar?: string
}

export type UserRole = 
  | 'company_owner' 
  | 'admin' 
  | 'manager' 
  | 'employee' 
  | 'viewer'

export interface Invitation {
  id: string
  email: string
  role: UserRole
  status: InvitationStatus
  invited_by: {
    id: string
    name: string
    email: string
  }
  created_at: string
  expires_at: string
  accepted_at?: string
  token: string
}

export type InvitationStatus = 
  | 'pending' 
  | 'accepted' 
  | 'expired' 
  | 'revoked'
  | 'declined'


export interface CreateInvitationData {
  email: string
  role: UserRole
  message?: string
}

export interface CompanySettings {
  id: string
  // General Settings
  timezone: string
  currency: string
  date_format: string
  time_format: string
  language: string
  
  // Notification Settings
  email_notifications: boolean
  push_notifications: boolean
  marketing_emails: boolean
  
  // Business Settings
  fiscal_year_start: string
  working_days: string[]
  working_hours_start: string
  working_hours_end: string
  
  // Security Settings
  require_2fa: boolean
  session_timeout: number
  password_policy: {
    min_length: number
    require_uppercase: boolean
    require_lowercase: boolean
    require_numbers: boolean
    require_symbols: boolean
  }
  
  // Integration Settings
  api_access_enabled: boolean
  webhook_url?: string
  
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  action: string
  resource_type: string
  resource_id?: string
  resource_name?: string
  details: Record<string, unknown>
  ip_address: string
  user_agent: string
  created_at: string
}

// Form-specific types
export interface CompanyFormData extends UpdateCompanyData {
  logo?: File
}

export interface SettingsFormData {
  // General
  timezone: string
  currency: string
  date_format: string
  time_format: string
  language: string
  
  // Notifications
  email_notifications: boolean
  push_notifications: boolean
  marketing_emails: boolean
  
  // Business
  fiscal_year_start: string
  working_days: string[]
  working_hours_start: string
  working_hours_end: string
  
  // Security
  require_2fa: boolean
  session_timeout: number
}

// Constants
export const INDUSTRIES = [
  'Manufacturing',
  'Retail',
  'E-commerce',
  'Healthcare',
  'Food & Beverage',
  'Automotive',
  'Technology',
  'Fashion & Apparel',
  'Electronics',
  'Pharmaceuticals',
  'Construction',
  'Agriculture',
  'Other'
] as const

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'company_owner',
    label: 'Company Owner',
    description: 'Full access to all features and settings'
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manage users, settings, and most operations'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Manage specific departments or teams'
  },
  {
    value: 'employee',
    label: 'Employee',
    description: 'Standard access to operational features'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to reports and data'
  }
]

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
] as const

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Africa/Nairobi',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
] as const