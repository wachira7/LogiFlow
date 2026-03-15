'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import type {
  GeneralSettings,
  NotificationPreferences,
  ChangePasswordRequest,
  UpdateGeneralSettingsRequest,
} from '@/types/settings.types'

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_order_updates: true,
  email_inventory_alerts: true,
  email_shipment_updates: true,
  email_payment_confirmations: true,
  email_team_invitations: true,
  email_system_updates: false,
  sms_critical_alerts: true,
  sms_order_confirmations: false,
  sms_delivery_updates: false,
  push_enabled: false,
  push_order_updates: false,
  push_inventory_alerts: false,
}

export function useSettings() {
  const { user, refreshAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)

  // Load general settings from user data
  useEffect(() => {
    if (user) {
      setGeneralSettings({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        profile_picture: user.profile_picture || '',
        company_name: user.company_name,
        timezone: 'EAT',
        language: 'en',
        date_format: 'MM/DD/YYYY',
        currency: 'USD',
      })
    }
  }, [user])

  // Fetch notification preferences from backend
  const fetchNotificationPreferences = useCallback(async (): Promise<void> => {
    setIsLoadingPreferences(true)
    try {
      const response = await api.get<NotificationPreferences>('/api/v1/auth/notification-preferences/')
      if (response.success && response.data) {
        setNotificationPreferences(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
    } finally {
      setIsLoadingPreferences(false)
    }
  }, [])

  // Auto-fetch preferences on mount
  useEffect(() => {
    if (user) {
      fetchNotificationPreferences()
    }
  }, [user, fetchNotificationPreferences])

  // Get general settings
  const getGeneralSettings = useCallback((): GeneralSettings | null => {
    return generalSettings
  }, [generalSettings])

  // Get notification preferences
  const getNotificationPreferences = useCallback((): NotificationPreferences => {
    return notificationPreferences
  }, [notificationPreferences])

  // Update general settings
  const updateGeneralSettings = useCallback(async (updates: UpdateGeneralSettingsRequest): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.patch('/api/v1/auth/profile/', updates)

      if (response.success) {
        setSuccess('Settings updated successfully')
        await refreshAuth()
        return true
      } else {
        setError(response.error || 'Failed to update settings')
        return false
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update settings')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshAuth])

  // Update notification preferences
  const updateNotificationPreferences = useCallback(async (preferences: NotificationPreferences): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.patch<NotificationPreferences>(
        '/api/v1/auth/notification-preferences/',
        preferences
      )

      if (response.success && response.data) {
        setNotificationPreferences(response.data)
        setSuccess('Notification preferences updated successfully')
        return true
      } else {
        setError(response.error || 'Failed to update notification preferences')
        return false
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update preferences')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Change password
  const changePassword = useCallback(async (request: ChangePasswordRequest): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.post('/api/v1/auth/change-password/', {
        old_password: request.old_password,
        new_password: request.new_password,
        new_password_confirm: request.new_password_confirm,
      })

      if (response.success) {
        setSuccess('Password changed successfully')
        return true
      } else {
        setError(response.error || 'Failed to change password')
        return false
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Upload avatar
  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.upload('/api/v1/auth/profile/avatar/', file, 'profile_picture')

      if (response.success) {
        setSuccess('Avatar uploaded successfully')
        await refreshAuth()
        return true
      } else {
        setError(response.error || 'Failed to upload avatar')
        return false
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload avatar')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshAuth])

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  return {
    // State
    user,
    isLoading,
    isLoadingPreferences,
    error,
    success,
    generalSettings,
    notificationPreferences,

    // Actions
    getGeneralSettings,
    getNotificationPreferences,
    fetchNotificationPreferences,
    updateGeneralSettings,
    updateNotificationPreferences,
    changePassword,
    uploadAvatar,
    clearMessages,
  }
}