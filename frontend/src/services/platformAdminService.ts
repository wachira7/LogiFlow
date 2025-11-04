// frontend/src/services/platformAdminService.ts
import { api } from './api'
import type { ApiResponse } from './api'
import type {
  PlatformSetting,
  CreatePlatformSettingData,
  UpdatePlatformSettingData,
  PlatformAuditLog,
  SecurityReport,
  SystemHealthMetric,
  SystemHealthDashboard,
  CreateHealthMetricData,
  PlatformNotification,
  CreateNotificationData,
  PlatformAnalytics,
  CompanyOverviewResponse,
  CompanyManagementData,
  CompanyManagementResponse,
  PaginatedResponse,
  PlatformAdminFilters,
} from '@/types/platform.types'

export class PlatformAdminService {
  // ============================================
  // PLATFORM SETTINGS
  // ============================================
  
  /**
   * Get all platform settings
   */
  static async getSettings(filters?: PlatformAdminFilters): Promise<ApiResponse<PlatformSetting[]>> {
    try {
      const params = new URLSearchParams()
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters?.search) params.append('search', filters.search)
      if (filters?.ordering) params.append('ordering', filters.ordering)
      
      const queryString = params.toString()
      const url = `/api/v1/platform-admin/settings/${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get<PlatformSetting[]>(url)
      return response
    } catch (error) {
      console.error('Failed to fetch platform settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
        status: 500,
      }
    }
  }

  /**
   * Get single platform setting
   */
  static async getSetting(id: string): Promise<ApiResponse<PlatformSetting>> {
    try {
      const response = await api.get<PlatformSetting>(`/api/v1/platform-admin/settings/${id}/`)
      return response
    } catch (error) {
      console.error('Failed to fetch platform setting:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load setting',
        status: 500,
      }
    }
  }

  /**
   * Create platform setting
   */
  static async createSetting(data: CreatePlatformSettingData): Promise<ApiResponse<PlatformSetting>> {
    try {
      const response = await api.post<PlatformSetting>('/api/v1/platform-admin/settings/', data)
      return response
    } catch (error) {
      console.error('Failed to create platform setting:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create setting',
        status: 500,
      }
    }
  }

  /**
   * Update platform setting
   */
  static async updateSetting(id: string, data: UpdatePlatformSettingData): Promise<ApiResponse<PlatformSetting>> {
    try {
      const response = await api.patch<PlatformSetting>(`/api/v1/platform-admin/settings/${id}/`, data)
      return response
    } catch (error) {
      console.error('Failed to update platform setting:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update setting',
        status: 500,
      }
    }
  }

  /**
   * Delete platform setting
   */
  static async deleteSetting(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<void>(`/api/v1/platform-admin/settings/${id}/`)
      return response
    } catch (error) {
      console.error('Failed to delete platform setting:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete setting',
        status: 500,
      }
    }
  }

  // ============================================
  // AUDIT LOGS
  // ============================================
  
  /**
   * Get audit logs
   */
  static async getAuditLogs(page: number = 1, filters?: PlatformAdminFilters): Promise<ApiResponse<PaginatedResponse<PlatformAuditLog>>> {
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      if (filters?.search) params.append('search', filters.search)
      if (filters?.ordering) params.append('ordering', filters.ordering)
      
      const queryString = params.toString()
      const url = `/api/v1/platform-admin/audit-logs/?${queryString}`
      
      const response = await api.get<PaginatedResponse<PlatformAuditLog>>(url)
      return response
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load audit logs',
        status: 500,
      }
    }
  }

  /**
   * Get security report
   */
  static async getSecurityReport(): Promise<ApiResponse<SecurityReport>> {
    try {
      const response = await api.get<SecurityReport>('/api/v1/platform-admin/audit-logs/security_report/')
      return response
    } catch (error) {
      console.error('Failed to fetch security report:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load security report',
        status: 500,
      }
    }
  }

  // ============================================
  // SYSTEM HEALTH
  // ============================================
  
  /**
   * Get system health metrics
   */
  static async getHealthMetrics(filters?: PlatformAdminFilters): Promise<ApiResponse<SystemHealthMetric[]>> {
    try {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      
      const queryString = params.toString()
      const url = `/api/v1/platform-admin/system-health/${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get<SystemHealthMetric[]>(url)
      return response
    } catch (error) {
      console.error('Failed to fetch health metrics:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load health metrics',
        status: 500,
      }
    }
  }

  /**
   * Get system health dashboard
   */
  static async getHealthDashboard(): Promise<ApiResponse<SystemHealthDashboard>> {
    try {
      const response = await api.get<SystemHealthDashboard>('/api/v1/platform-admin/system-health/dashboard/')
      return response
    } catch (error) {
      console.error('Failed to fetch health dashboard:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load health dashboard',
        status: 500,
      }
    }
  }

  /**
   * Create health metric
   */
  static async createHealthMetric(data: CreateHealthMetricData): Promise<ApiResponse<SystemHealthMetric>> {
    try {
      const response = await api.post<SystemHealthMetric>('/api/v1/platform-admin/system-health/', data)
      return response
    } catch (error) {
      console.error('Failed to create health metric:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create metric',
        status: 500,
      }
    }
  }

  /**
   * Generate test health metrics
   */
  static async generateTestMetrics(): Promise<ApiResponse<{ message: string; metrics: string[] }>> {
    try {
      const response = await api.post<{ message: string; metrics: string[] }>(
        '/api/v1/platform-admin/system-health/generate_test_metrics/',
        {}
      )
      return response
    } catch (error) {
      console.error('Failed to generate test metrics:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metrics',
        status: 500,
      }
    }
  }
  
  /**
   * Get all platform notifications
   */
  static async getNotifications(filters?: PlatformAdminFilters): Promise<ApiResponse<PlatformNotification[]>> {
    try {
      const params = new URLSearchParams()
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters?.search) params.append('search', filters.search)
      
      const queryString = params.toString()
      const url = `/api/v1/platform-admin/notifications/${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get<PlatformNotification[]>(url)
      return response
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load notifications',
        status: 500,
      }
    }
  }


  /**
   * Get single notification
   */
  static async getNotification(id: string): Promise<ApiResponse<PlatformNotification>> {
    try {
      const response = await api.get<PlatformNotification>(`/api/v1/platform-admin/notifications/${id}/`)
      return response
    } catch (error) {
      console.error('Failed to fetch notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load notification',
        status: 500,
      }
    }
  }

  /**
   * Create platform notification
   */
  static async createNotification(data: CreateNotificationData): Promise<ApiResponse<PlatformNotification>> {
    try {
      const response = await api.post<PlatformNotification>('/api/v1/platform-admin/notifications/', data)
      return response
    } catch (error) {
      console.error('Failed to create notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
        status: 500,
      }
    }
  }

  /**
   * Update platform notification
   */
  static async updateNotification(id: string, data: Partial<CreateNotificationData>): Promise<ApiResponse<PlatformNotification>> {
    try {
      const response = await api.patch<PlatformNotification>(`/api/v1/platform-admin/notifications/${id}/`, data)
      return response
    } catch (error) {
      console.error('Failed to update notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification',
        status: 500,
      }
    }
  }

  /**
   * Delete platform notification
   */
  static async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<void>(`/api/v1/platform-admin/notifications/${id}/`)
      return response
    } catch (error) {
      console.error('Failed to delete notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
        status: 500,
      }
    }
  }

  // ============================================
  // PLATFORM ANALYTICS
  // ============================================
  
  /**
   * Get platform analytics overview
   */
  static async getAnalyticsOverview(): Promise<ApiResponse<PlatformAnalytics>> {
    try {
      const response = await api.get<PlatformAnalytics>('/api/v1/platform-admin/analytics/overview/')
      return response
    } catch (error) {
      console.error('Failed to fetch analytics overview:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics',
        status: 500,
      }
    }
  }

  /**
   * Get company overview analytics
   */
  static async getCompanyOverview(): Promise<ApiResponse<CompanyOverviewResponse>> {
    try {
      const response = await api.get<CompanyOverviewResponse>('/api/v1/platform-admin/analytics/company_overview/')
      return response
    } catch (error) {
      console.error('Failed to fetch company overview:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load company data',
        status: 500,
      }
    }
  }

  /**
   * Manage company (suspend, activate, delete, reset trial)
   */
  static async manageCompany(data: CompanyManagementData): Promise<ApiResponse<CompanyManagementResponse>> {
    try {
      const response = await api.post<CompanyManagementResponse>(
        '/api/v1/platform-admin/analytics/manage_company/',
        data
      )
      return response
    } catch (error) {
      console.error('Failed to manage company:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage company',
        status: 500,
      }
    }
  }
}
