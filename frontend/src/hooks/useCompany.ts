// frontend/src/hooks/useCompany.ts
import { useState, useEffect, useCallback } from 'react'
import { CompanyService } from '@/services/companyService'
import type { Company, Invitation, CompanySettings, AuditLog, CompanyFormData, SettingsFormData, CreateInvitationData } from '@/types/company.types'
import { useToast } from './use-toast'

interface UseCompanyReturn {
  // Company state
  company: Company | null
  isLoadingCompany: boolean
  companyError: string | null
  
  // Invitations state
  invitations: Invitation[]
  isLoadingInvitations: boolean
  invitationsError: string | null
  
  // Settings state
  settings: CompanySettings | null
  isLoadingSettings: boolean
  settingsError: string | null
  
  // Audit logs state
  auditLogs: AuditLog[]
  isLoadingAuditLogs: boolean
  auditLogsError: string | null
  
  // Company actions
  fetchCompany: () => Promise<void>
  updateCompany: (data: CompanyFormData) => Promise<boolean>
  uploadLogo: (file: File) => Promise<boolean>
  
  // Invitation actions
  fetchInvitations: () => Promise<void>
  createInvitation: (data: CreateInvitationData) => Promise<boolean>
  resendInvitation: (invitationId: string) => Promise<boolean>
  revokeInvitation: (invitationId: string) => Promise<boolean>
  
  // Settings actions
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<SettingsFormData>) => Promise<boolean>  // ✅ Changed from SettingsFormData
  
  // Audit log actions
  fetchAuditLogs: (page?: number) => Promise<void>
  
  // Refresh all
  refreshAll: () => Promise<void>
}

export function useCompany(): UseCompanyReturn {
  const { toast } = useToast()
  
  // Company state
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoadingCompany, setIsLoadingCompany] = useState(false)
  const [companyError, setCompanyError] = useState<string | null>(null)
  
  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [invitationsError, setInvitationsError] = useState<string | null>(null)
  
  // Settings state
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false)
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null)
  
  // Fetch company details
  const fetchCompany = useCallback(async () => {
    setIsLoadingCompany(true)
    setCompanyError(null)
    
    try {
      const response = await CompanyService.getCompany()
      
      if (response.success && response.data) {
        setCompany(response.data)
      } else {
        setCompanyError(response.error || 'Failed to load company')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to load company details',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load company'
      setCompanyError(message)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      })
    } finally {
      setIsLoadingCompany(false)
    }
  }, [toast])
  
  // Update company
  const updateCompany = useCallback(async (data: CompanyFormData): Promise<boolean> => {
    try {
      const response = await CompanyService.updateCompany(data)
      
      if (response.success && response.data) {
        setCompany(response.data)
        toast({
          title: 'Success',
          description: 'Company profile updated successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to update company',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update company',
      })
      return false
    }
  }, [toast])
  
  // Upload logo
  const uploadLogo = useCallback(async (file: File): Promise<boolean> => {
    try {
      const response = await CompanyService.uploadLogo(file)
      
      if (response.success) {
        await fetchCompany() // Refresh company data
        toast({
          title: 'Success',
          description: 'Logo uploaded successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to upload logo',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
      })
      return false
    }
  }, [fetchCompany, toast])
  
  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    setIsLoadingInvitations(true)
    setInvitationsError(null)
    
    try {
      const response = await CompanyService.getInvitations()
      
      if (response.success && response.data) {
        setInvitations(response.data)
      } else {
        setInvitationsError(response.error || 'Failed to load invitations')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load invitations'
      setInvitationsError(message)
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [])
  
  // Create invitation
  const createInvitation = useCallback(async (data: CreateInvitationData): Promise<boolean> => {
    try {
      const response = await CompanyService.createInvitation(data)
      
      if (response.success) {
        await fetchInvitations() // Refresh invitations
        toast({
          title: 'Success',
          description: `Invitation sent to ${data.email}`,
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to send invitation',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
      })
      return false
    }
  }, [fetchInvitations, toast])
  
  // Resend invitation
  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const response = await CompanyService.resendInvitation(invitationId)
      
      if (response.success) {
        await fetchInvitations()
        toast({
          title: 'Success',
          description: 'Invitation resent successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to resend invitation',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
      })
      return false
    }
  }, [fetchInvitations, toast])
  
  // Revoke invitation
  const revokeInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const response = await CompanyService.revokeInvitation(invitationId)
      
      if (response.success) {
        await fetchInvitations()
        toast({
          title: 'Success',
          description: 'Invitation revoked successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to revoke invitation',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke invitation',
      })
      return false
    }
  }, [fetchInvitations, toast])
  
  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    setSettingsError(null)
    
    try {
      const response = await CompanyService.getSettings()
      
      if (response.success && response.data) {
        setSettings(response.data)
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
  
  // Update settings - ✅ UPDATED to accept Partial<SettingsFormData>
  const updateSettings = useCallback(async (data: Partial<SettingsFormData>): Promise<boolean> => {
    try {
      // Cast to CompanySettings since they have the same shape
      const response = await CompanyService.updateSettings(data as Partial<CompanySettings>)
      
      if (response.success && response.data) {
        setSettings(response.data)
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        })
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to update settings',
        })
        return false
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
      })
      return false
    }
  }, [toast])
  
  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (page: number = 1) => {
    setIsLoadingAuditLogs(true)
    setAuditLogsError(null)
    
    try {
      const response = await CompanyService.getAuditLogs(page)
      
      if (response.success && response.data) {
        setAuditLogs(response.data.results)
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
  
  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchCompany(),
      fetchInvitations(),
      fetchSettings(),
      fetchAuditLogs(),
    ])
  }, [fetchCompany, fetchInvitations, fetchSettings, fetchAuditLogs])
  
  // Load initial data on mount
  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])
  
  return {
    // Company
    company,
    isLoadingCompany,
    companyError,
    fetchCompany,
    updateCompany,
    uploadLogo,
    
    // Invitations
    invitations,
    isLoadingInvitations,
    invitationsError,
    fetchInvitations,
    createInvitation,
    resendInvitation,
    revokeInvitation,
    
    // Settings
    settings,
    isLoadingSettings,
    settingsError,
    fetchSettings,
    updateSettings,
    
    // Audit Logs
    auditLogs,
    isLoadingAuditLogs,
    auditLogsError,
    fetchAuditLogs,
    
    // Utils
    refreshAll,
  }
}