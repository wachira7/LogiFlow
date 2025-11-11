// types/settings.types.ts

export interface GeneralSettings {
  // User Info
  first_name: string
  last_name: string
  email: string
  phone_number: string
  profile_picture: string
  
  // Company Info (if company owner)
  company_name?: string
  company_industry?: string
  company_email?: string
  company_phone?: string
  company_address?: string
  company_logo?: string
  
  // Preferences
  timezone: string
  language: string
  date_format: string
  currency: string
}

export interface SecuritySettings {
  current_password: string
  new_password: string
  new_password_confirm: string
  two_factor_enabled: boolean
  login_alerts: boolean
}

export interface NotificationPreferences {
  email_notifications: {
    order_updates: boolean
    inventory_alerts: boolean
    shipment_updates: boolean
    payment_confirmations: boolean
    team_invitations: boolean
    system_updates: boolean
  }
  sms_notifications: {
    critical_alerts: boolean
    order_confirmations: boolean
    delivery_updates: boolean
  }
  push_notifications: {
    enabled: boolean
    order_updates: boolean
    inventory_alerts: boolean
  }
}

export interface Integration {
  id: string
  name: string
  type: 'payment' | 'shipping' | 'erp' | 'accounting' | 'api'
  status: 'active' | 'inactive' | 'error'
  connected_at: string
  last_sync?: string
  config?: Record<string, unknown>
}

export interface PaymentIntegration extends Integration {
  type: 'payment'
  provider: 'stripe' | 'mpesa' | 'crypto'
  api_key?: string
  webhook_url?: string
  test_mode: boolean
}

export interface ShippingIntegration extends Integration {
  type: 'shipping'
  provider: string
  tracking_enabled: boolean
  auto_update: boolean
}

export interface APIKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used?: string
  permissions: string[]
  status: 'active' | 'revoked'
}

export interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip_address: string
  last_active: string
  is_current: boolean
}

export interface LoginHistory {
  id: string
  timestamp: string
  ip_address: string
  location: string
  device: string
  browser: string
  success: boolean
}

export interface UpdateGeneralSettingsRequest {
  first_name?: string
  last_name?: string
  phone_number?: string
  profile_picture?: string
  timezone?: string
  language?: string
  date_format?: string
  currency?: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export interface UpdateNotificationPreferencesRequest {
  preferences: NotificationPreferences
}

export interface CreateAPIKeyRequest {
  name: string
  permissions: string[]
}

export interface RevokeAPIKeyRequest {
  key_id: string
}

export interface TerminateSessionRequest {
  session_id: string
}