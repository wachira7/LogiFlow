// hooks/useSettings.ts
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
  email_notifications: {
    order_updates: true,
    inventory_alerts: true,
    shipment_updates: true,
    payment_confirmations: true,
    team_invitations: true,
    system_updates: false,
  },
  sms_notifications: {
    critical_alerts: true,
    order_confirmations: false,
    delivery_updates: false,
  },
  push_notifications: {
    enabled: false,
    order_updates: false,
    inventory_alerts: false,
  },
}

export function useSettings() {
  const { user, refreshAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null)

  // Load general settings from user data
  useEffect(() => {
    if (user) {
      const settings: GeneralSettings = {
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
      }
      setGeneralSettings(settings)
    }
  }, [user])

  // Get general settings
  const getGeneralSettings = useCallback((): GeneralSettings | null => {
    return generalSettings
  }, [generalSettings])

  // Get notification preferences from localStorage
  const getNotificationPreferences = useCallback((): NotificationPreferences => {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES
    
    try {
      const stored = localStorage.getItem('notificationPreferences')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
    
    return DEFAULT_NOTIFICATION_PREFERENCES
  }, [])

  // Save notification preferences to localStorage
  const saveNotificationPreferences = useCallback((preferences: NotificationPreferences): boolean => {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
      return true
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      return false
    }
  }, [])

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
      const message = error instanceof Error ? error.message : 'Failed to update settings'
      setError(message)
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
      // Save to localStorage (since we don't have backend endpoint yet)
      const saved = saveNotificationPreferences(preferences)
      
      if (saved) {
        setSuccess('Notification preferences updated successfully')
        return true
      } else {
        setError('Failed to save notification preferences')
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [saveNotificationPreferences])

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
      const message = error instanceof Error ? error.message : 'Failed to change password'
      setError(message)
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
      const message = error instanceof Error ? error.message : 'Failed to upload avatar'
      setError(message)
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
    error,
    success,
    generalSettings,

    // Actions
    getGeneralSettings,
    updateGeneralSettings,
    updateNotificationPreferences,
    changePassword,
    uploadAvatar,
    getNotificationPreferences,
    clearMessages,
  }
}