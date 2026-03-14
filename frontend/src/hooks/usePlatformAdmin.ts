// frontend/src/hooks/usePlatformAdmin.ts
import { useState, useCallback } from 'react'
import { PlatformAdminService } from '@/services/platformAdminService'
import type {
  PlatformSetting,
  PlatformAuditLog,
  SystemHealthMetric,
  SystemHealthDashboard,
  PlatformAnalytics,
  CompanyOverview,
  SecurityReport,
  CompanyManagementData,
  CreatePlatformSettingData,
  UpdatePlatformSettingData,
  CreateHealthMetricData,
  PlatformAdminFilters,
  PlatformNotification,
  CreateNotificationData,
} from '@/types/platform.types'
import { useToast } from './use-toast'

interface UsePlatformAdminReturn {
  // Settings state
  settings: PlatformSetting[]
  isLoadingSettings: boolean
  settingsError: string | null
  
  // Audit logs state
  auditLogs: PlatformAuditLog[]
  isLoadingAuditLogs: boolean
  auditLogsError: string | null
  
  // Health metrics state
  healthMetrics: SystemHealthMetric[]
  healthDashboard: SystemHealthDashboard | null
  isLoadingHealth: boolean
  healthError: string | null
  
  // Notifications state
  notifications: PlatformNotification[]
  isLoadingNotifications: boolean
  notificationsError: string | null
  
  // Analytics state
  analytics: PlatformAnalytics | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
  
  // Companies state
  companies: CompanyOverview[]
  isLoadingCompanies: boolean
  companiesError: string | null
  
  // Security report state
  securityReport: SecurityReport | null
  isLoadingSecurityReport: boolean
  
  // Settings actions
  fetchSettings: (filters?: PlatformAdminFilters) => Promise<void>
  createSetting: (data: CreatePlatformSettingData) => Promise<boolean>
  updateSetting: (id: string, data: UpdatePlatformSettingData) => Promise<boolean>
  deleteSetting: (id: string) => Promise<boolean>
  
  // Audit log actions
  fetchAuditLogs: (page?: number, filters?: PlatformAdminFilters) => Promise<void>
  fetchSecurityReport: () => Promise<void>
  
  // Health actions
  fetchHealthMetrics: (filters?: PlatformAdminFilters) => Promise<void>
  fetchHealthDashboard: () => Promise<void>
  createHealthMetric: (data: CreateHealthMetricData) => Promise<boolean>
  generateTestMetrics: () => Promise<boolean>
  
  // Notification actions
  fetchNotifications: (filters?: PlatformAdminFilters) => Promise<void>
  createNotification: (data: CreateNotificationData) => Promise<boolean>
  updateNotification: (id: string, data: Partial<CreateNotificationData>) => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  markNotificationSent: (id: string) => Promise<boolean>
  sendNotificationNow: (id: string) => Promise<boolean>

  
  // Analytics actions
  fetchAnalytics: () => Promise<void>
  fetchCompanies: () => Promise<void>
  manageCompany: (data: CompanyManagementData) => Promise<boolean>
  
  // Refresh all
  refreshAll: () => Promise<void>
}

export function usePlatformAdmin(): UsePlatformAdminReturn {
  const { toast } = useToast()
  
  // Settings state
  const [settings, setSettings] = useState<PlatformSetting[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([])
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false)
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null)
  
  // Health state
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetric[]>([])
  const [healthDashboard, setHealthDashboard] = useState<SystemHealthDashboard | null>(null)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)
  
  // Analytics state
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  
  // Companies state
  const [companies, setCompanies] = useState<CompanyOverview[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  
  // Security report state
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null)
  const [isLoadingSecurityReport, setIsLoadingSecurityReport] = useState(false)
  
  // ============================================
  // SETTINGS ACTIONS
  // ============================================
  
  const fetchSettings = useCallback(async (filters?: PlatformAdminFilters) => {
    setIsLoadingSettings(true)
    setSettingsError(null)
    
    try {
      const response = await PlatformAdminService.getSettings(filters)
      
      if (response.success && response.data) {
        setSettings(Array.isArray(response.data) ? response.data : [])
      } else {
        setSettingsError(response.error || 'Failed to load settings')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings'
      setSettingsError(message)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])
  
  const createSetting = useCallback(async (data: CreatePlatformSettingData): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.createSetting(data)
      
      if (response.success) {
        await fetchSettings()
        toast({
          title: 'Success',
          description: 'Setting created successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to create setting',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create setting',
      })
      return false
    }
  }, [fetchSettings, toast])
  
  const updateSetting = useCallback(async (id: string, data: UpdatePlatformSettingData): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.updateSetting(id, data)
      
      if (response.success) {
        await fetchSettings()
        toast({
          title: 'Success',
          description: 'Setting updated successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to update setting',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update setting',
      })
      return false
    }
  }, [fetchSettings, toast])
  
  const deleteSetting = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.deleteSetting(id)
      
      if (response.success) {
        await fetchSettings()
        toast({
          title: 'Success',
          description: 'Setting deleted successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to delete setting',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete setting',
      })
      return false
    }
  }, [fetchSettings, toast])
  
  // ============================================
  // AUDIT LOG ACTIONS
  // ============================================
  
  const fetchAuditLogs = useCallback(async (page: number = 1, filters?: PlatformAdminFilters) => {
    setIsLoadingAuditLogs(true)
    setAuditLogsError(null)
    
    try {
      const response = await PlatformAdminService.getAuditLogs(page, filters)
      
      if (response.success && response.data) {
        setAuditLogs(response.data.results || [])
      } else {
        setAuditLogsError(response.error || 'Failed to load audit logs')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load audit logs'
      setAuditLogsError(message)
    } finally {
      setIsLoadingAuditLogs(false)
    }
  }, [])
  
  const fetchSecurityReport = useCallback(async () => {
    setIsLoadingSecurityReport(true)
    
    try {
      const response = await PlatformAdminService.getSecurityReport()
      
      if (response.success && response.data) {
        setSecurityReport(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch security report:', error)
    } finally {
      setIsLoadingSecurityReport(false)
    }
  }, [])
  
  // ============================================
  // HEALTH ACTIONS
  // ============================================
  
  const fetchHealthMetrics = useCallback(async (filters?: PlatformAdminFilters) => {
    setIsLoadingHealth(true)
    setHealthError(null)
    
    try {
      const response = await PlatformAdminService.getHealthMetrics(filters)
      
      if (response.success && response.data) {
        setHealthMetrics(Array.isArray(response.data) ? response.data : [])
      } else {
        setHealthError(response.error || 'Failed to load health metrics')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load health metrics'
      setHealthError(message)
    } finally {
      setIsLoadingHealth(false)
    }
  }, [])
  
  const fetchHealthDashboard = useCallback(async () => {
    setIsLoadingHealth(true)
    setHealthError(null)
    
    try {
      const response = await PlatformAdminService.getHealthDashboard()
      
      if (response.success && response.data) {
        setHealthDashboard(response.data)
      } else {
        setHealthError(response.error || 'Failed to load health dashboard')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load health dashboard'
      setHealthError(message)
    } finally {
      setIsLoadingHealth(false)
    }
  }, [])
  
  const createHealthMetric = useCallback(async (data: CreateHealthMetricData): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.createHealthMetric(data)
      
      if (response.success) {
        await fetchHealthMetrics()
        toast({
          title: 'Success',
          description: 'Health metric created successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to create metric',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create metric',
      })
      return false
    }
  }, [fetchHealthMetrics, toast])
  
  const generateTestMetrics = useCallback(async (): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.generateTestMetrics()
      
      if (response.success) {
        await fetchHealthMetrics()
        await fetchHealthDashboard()
        toast({
          title: 'Success',
          description: 'Test metrics generated successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to generate metrics',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate metrics',
      })
      return false
    }
  }, [fetchHealthMetrics, fetchHealthDashboard, toast])

  // ============================================
  // NOTIFICATION ACTIONS
  // ============================================
  
  const fetchNotifications = useCallback(async (filters?: PlatformAdminFilters) => {
    setIsLoadingNotifications(true)
    setNotificationsError(null)
    
    try {
      const response = await PlatformAdminService.getNotifications(filters)
      
      if (response.success && response.data) {
        setNotifications(Array.isArray(response.data) ? response.data : [])
      } else {
        setNotificationsError(response.error || 'Failed to load notifications')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notifications'
      setNotificationsError(message)
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])
  
  const createNotification = useCallback(async (data: CreateNotificationData): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.createNotification(data)
      
      if (response.success) {
        await fetchNotifications()
        toast({
          title: 'Success',
          description: 'Notification created successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to create notification',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create notification',
      })
      return false
    }
  }, [fetchNotifications, toast])
  
  const updateNotification = useCallback(async (id: string, data: Partial<CreateNotificationData>): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.updateNotification(id, data)
      
      if (response.success) {
        await fetchNotifications()
        toast({
          title: 'Success',
          description: 'Notification updated successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to update notification',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update notification',
      })
      return false
    }
  }, [fetchNotifications, toast])
  
  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.deleteNotification(id)
      
      if (response.success) {
        await fetchNotifications()
        toast({
          title: 'Success',
          description: 'Notification deleted successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to delete notification',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete notification',
      })
      return false
    }
  }, [fetchNotifications, toast])


  const markNotificationSent = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.markNotificationSent(id)
      if (response.success) {
        await fetchNotifications()
        toast({ title: 'Success', description: 'Notification marked as sent' })
        return true
      } else {
        toast({ variant: 'destructive', title: 'Error', description: response.error || 'Failed to mark as sent' })
        return false
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to mark as sent' })
      return false
    }
  }, [fetchNotifications, toast])

  const sendNotificationNow = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.sendNotificationNow(id)
      if (response.success) {
        await fetchNotifications()
        toast({ title: 'Success', description: response.data?.message || 'Notification sent successfully' })
        return true
      } else {
        toast({ variant: 'destructive', title: 'Error', description: response.error || 'Failed to send notification' })
        return false
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to send notification' })
      return false
    }
  }, [fetchNotifications, toast])
    
  // ============================================
  // ANALYTICS ACTIONS
  // ============================================
  
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true)
    setAnalyticsError(null)
    
    try {
      const response = await PlatformAdminService.getAnalyticsOverview()
      
      if (response.success && response.data) {
        setAnalytics(response.data)
      } else {
        setAnalyticsError(response.error || 'Failed to load analytics')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics'
      setAnalyticsError(message)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [])
  
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    setCompaniesError(null)
    
    try {
      const response = await PlatformAdminService.getCompanyOverview()
      
      if (response.success && response.data) {
        setCompanies(response.data.companies || [])
      } else {
        setCompaniesError(response.error || 'Failed to load companies')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load companies'
      setCompaniesError(message)
    } finally {
      setIsLoadingCompanies(false)
    }
  }, [])
  
  const manageCompany = useCallback(async (data: CompanyManagementData): Promise<boolean> => {
    try {
      const response = await PlatformAdminService.manageCompany(data)
      
      if (response.success) {
        await fetchCompanies()
        await fetchAnalytics()
        toast({
          title: 'Success',
          description: response.data?.message || 'Company managed successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to manage company',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to manage company',
      })
      return false
    }
  }, [fetchCompanies, fetchAnalytics, toast])
  
  // ============================================
  // REFRESH ALL
  // ============================================
  
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSettings(),
      fetchAuditLogs(),
      fetchHealthMetrics(),
      fetchHealthDashboard(),
      fetchAnalytics(),
      fetchCompanies(),
      fetchSecurityReport(),
      fetchNotifications(),
    ])
  }, [
    fetchSettings,
    fetchAuditLogs,
    fetchHealthMetrics,
    fetchHealthDashboard,
    fetchAnalytics,
    fetchCompanies,
    fetchSecurityReport,
    fetchNotifications,
  ])
  
  return {
    // Settings
    settings,
    isLoadingSettings,
    settingsError,
    fetchSettings,
    createSetting,
    updateSetting,
    deleteSetting,
    
    // Audit Logs
    auditLogs,
    isLoadingAuditLogs,
    auditLogsError,
    fetchAuditLogs,
    fetchSecurityReport,
    securityReport,
    isLoadingSecurityReport,
    
    // Health
    healthMetrics,
    healthDashboard,
    isLoadingHealth,
    healthError,
    fetchHealthMetrics,
    fetchHealthDashboard,
    createHealthMetric,
    generateTestMetrics,
    
    // Analytics
    analytics,
    isLoadingAnalytics,
    analyticsError,
    fetchAnalytics,
    
    // Companies
    companies,
    isLoadingCompanies,
    companiesError,
    fetchCompanies,
    manageCompany,

    // Notifications 
    notifications,
    isLoadingNotifications,
    notificationsError,
    fetchNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    markNotificationSent,
    sendNotificationNow,
    
    // Utils
    refreshAll,
  }
}
