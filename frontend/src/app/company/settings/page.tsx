// app/company/settings/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { CompanySettings } from '@/components/company/CompanySettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CompanyService } from '@/services/companyService'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Users, 
  Building, 
  Shield,
  Settings as SettingsIcon,
  Bell,
  Lock,
  Globe,
  Clock,
  Mail,
  Calendar
} from 'lucide-react'
import type { Company, CompanySettings as CompanySettingsType, SettingsFormData, Invitation } from '@/types/company.types'

function CompanySettingsContent() {
  const [company, setCompany] = useState<Company | null>(null)
  const [settings, setSettings] = useState<CompanySettingsType | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [companyResponse, settingsResponse, invitationsResponse] = await Promise.all([
        CompanyService.getCompany(),
        CompanyService.getSettings(),
        CompanyService.getInvitations()
      ])

      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data)
      }

      if (settingsResponse.success && settingsResponse.data) {
        setSettings(settingsResponse.data)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to load settings",
          description: settingsResponse.error || "Unable to load company settings",
        })
      }

      if (invitationsResponse.success && invitationsResponse.data) {
        setInvitations(Array.isArray(invitationsResponse.data) ? invitationsResponse.data : [])
      } else {
        setInvitations([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleUpdate = async (data: SettingsFormData) => {
    try {
      const response = await CompanyService.updateSettings(data)
      if (response.success && response.data) {
        setSettings(response.data)
        toast({
          title: "Success",
          description: "Company settings updated successfully",
        })
      } else {
        throw new Error(response.error || 'Update failed')
      }
    } catch (error) {
      console.error('Settings update error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
      })
      throw error
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading company settings..." />
      </div>
    )
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Company Settings</h1>
            <p className="text-muted-foreground">
              Configure your company preferences and operational settings
            </p>
          </div>
        </div>
        
        {/* Quick navigation */}
        <div className="flex space-x-2">
          <Link href="/company/profile">
            <Button variant="outline" size="sm">
              <Building className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </Link>
          <Link href="/company/users">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Team ({company?.users_count || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Company Overview */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Company Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={company.logo} alt={company.name} />
                <AvatarFallback className="text-xl">
                  {company.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{company.name}</h2>
                    <Badge variant="outline" className="mt-1">
                      {company.industry}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Team Size</p>
                      <p className="font-semibold">{company.users_count} members</p>
                    </div>
                    {pendingInvitations.length > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Pending Invites</p>
                        <Badge variant="secondary">{pendingInvitations.length}</Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{company.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Since {new Date(company.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* {company.description && (
                  <p className="text-muted-foreground mt-2">{company.description}</p>
                )} */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">General</h3>
                <p className="text-sm text-muted-foreground">Basic company settings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Security</h3>
                <p className="text-sm text-muted-foreground">Access & permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Email & alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Integration</h3>
                <p className="text-sm text-muted-foreground">External services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Settings Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Security & Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Manage two-factor authentication, access controls, and data privacy settings.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Two-Factor Authentication</span>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Data Encryption</span>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Working Hours & Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Configure business hours, time zones, and operational schedules.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Business Hours</span>
                <span className="text-sm text-muted-foreground">9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Time Zone</span>
                <span className="text-sm text-muted-foreground">UTC+3 (EAT)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Settings Form */}
      <CompanySettings 
        settings={settings}
        isLoading={false}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

export default function CompanySettingsPage() {
  return (
    <PrivateRoute>
      <CompanySettingsContent />
    </PrivateRoute>
  )
}