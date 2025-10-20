// frontend/src/services/companyService.ts
import { api } from './api'
import type { ApiResponse } from './api'
import type { 
  Company, 
  Invitation, 
  CompanySettings, 
  AuditLog,
  CreateInvitationData,
  UpdateCompanyData 
} from '@/types/company.types'

export class CompanyService {
  /**
   * Get company details
   */
  static async getCompany(): Promise<ApiResponse<Company>> {
    try {
      const response = await api.get<Company>('/api/v1/tenants/company/')
      return response
    } catch (error) {
      console.error('Failed to fetch company details:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load company details',
        status: 500,
      }
    }
  }

  /**
   * Update company details
   */
  static async updateCompany(data: UpdateCompanyData): Promise<ApiResponse<Company>> {
    try {
      const response = await api.patch<Company>('/api/v1/tenants/company/', data)
      return response
    } catch (error) {
      console.error('Failed to update company details:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update company details',
        status: 500,
      }
    }
  }

  /**
 * Upload company logo
 */
  static async uploadLogo(file: File): Promise<ApiResponse<{ logo_url: string }>> {
    try {
      const response = await api.upload<{ logo_url: string }>(
        '/api/v1/tenants/company/logo/', 
        file,
        'logo'
      )
      return response
    } catch (error) {
      console.error('Failed to upload company logo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload logo',
        status: 500,
      }
    }
  }

  // INVITATION MANAGEMENT

  /**
   * Get all invitations
   */
  static async getInvitations(): Promise<ApiResponse<Invitation[]>> {
    try {
      const response = await api.get<Invitation[]>('/api/v1/tenants/invitations/')
      return response
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load invitations',
        status: 500,
      }
    }
  }

  /**
   * Create new invitation
   */
  static async createInvitation(data: CreateInvitationData): Promise<ApiResponse<Invitation>> {
    try {
      const response = await api.post<Invitation>('/api/v1/tenants/invitations/', data)
      return response
    } catch (error) {
      console.error('Failed to create invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation',
        status: 500,
      }
    }
  }

  /**
   * Revoke invitation
   */
  static async revokeInvitation(invitationId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await api.delete<{ success: boolean }>(`/api/v1/tenants/invitations/${invitationId}/revoke/`)
      return response
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke invitation',
        status: 500,
      }
    }
  }

  /**
   * Resend invitation
   */
  static async resendInvitation(invitationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>(`/api/v1/tenants/invitations/${invitationId}/resend/`, {})
      return response
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation',
        status: 500,
      }
    }
  }

  // COMPANY SETTINGS - ✅ NOW SIMPLIFIED!

  /**
   * Get company settings (structured object from backend)
   */
  static async getSettings(): Promise<ApiResponse<CompanySettings>> {
    try {
      const response = await api.get<CompanySettings>('/api/v1/tenants/settings/')
      return response
    } catch (error) {
      console.error('Failed to fetch company settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
        status: 500,
      }
    }
  }

  /**
   * Update company settings
   */
  static async updateSettings(data: Partial<CompanySettings>): Promise<ApiResponse<CompanySettings>> {
    try {
      const response = await api.patch<CompanySettings>('/api/v1/tenants/settings/', data)
      return response
    } catch (error) {
      console.error('Failed to update company settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
        status: 500,
      }
    }
  }

  // AUDIT LOGS

  /**
   * Get audit logs
   */
  static async getAuditLogs(page: number = 1, limit: number = 50): Promise<ApiResponse<{
    results: AuditLog[]
    count: number
    next?: string
    previous?: string
  }>> {
    try {
      const response = await api.get<{
        results: AuditLog[]
        count: number
        next?: string
        previous?: string
      }>(`/api/v1/tenants/audit-logs/?page=${page}&limit=${limit}`)
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
}