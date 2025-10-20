// app/company/profile/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { CompanyProfile } from '@/components/company/CompanyProfile'
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
  Settings, 
  Mail, 
  Calendar,
  ArrowRight,
  Building
} from 'lucide-react'
import type { Company, CompanyFormData, Invitation } from '@/types/company.types'

function CompanyProfileContent() {
  const [company, setCompany] = useState<Company | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadCompany = useCallback(async () => {
    setIsLoading(true)
    try {
      const [companyResponse, invitationsResponse] = await Promise.all([
        CompanyService.getCompany(),
        CompanyService.getInvitations()
      ])

      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to load company",
          description: companyResponse.error || "Unable to load company profile",
        })
      }

      if (invitationsResponse.success && invitationsResponse.data) {
        setInvitations(Array.isArray(invitationsResponse.data) ? invitationsResponse.data : [])
      } else {
        setInvitations([])
      }
    } catch (error) {
      console.error('Error loading company:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleUpdate = async (data: CompanyFormData) => {
    const { logo, ...updateData } = data
    
    try {
      // Upload logo first if provided
      if (logo) {
        const logoResponse = await CompanyService.uploadLogo(logo)
        if (logoResponse.success && logoResponse.data) {
          // Create extended update data with logo URL
          const extendedUpdateData = {
            ...updateData,
            logo: logoResponse.data.logo_url
          }
          
          // Update company details with logo
          const response = await CompanyService.updateCompany(extendedUpdateData)
          if (response.success && response.data) {
            setCompany(response.data)
            toast({
              title: "Success",
              description: "Company profile updated successfully",
            })
          } else {
            throw new Error(response.error || 'Update failed')
          }
          return
        }
      }

      // Update company details without logo
      const response = await CompanyService.updateCompany(updateData)
      if (response.success && response.data) {
        setCompany(response.data)
        toast({
          title: "Success",
          description: "Company profile updated successfully",
        })
      } else {
        throw new Error(response.error || 'Update failed')
      }
    } catch (error) {
      console.error('Company update error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update company profile",
      })
      throw error
    }
  }

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading company profile..." />
      </div>
    )
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Company Profile</h1>
            <p className="text-muted-foreground">
              Manage your company information and branding
            </p>
          </div>
        </div>
        
        {/* Quick navigation */}
        <div className="flex space-x-2">
          <Link href="/company/users">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Team ({company?.users_count || 0})
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
          <Link href="/company/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Company Overview Card */}
      {company && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Company Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{company.users_count} members</span>
                    </div>
                    {pendingInvitations.length > 0 && (
                      <Badge variant="secondary">
                        {pendingInvitations.length} pending invites
                      </Badge>
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
      
      {/* Profile Form */}
      <CompanyProfile 
        company={company}
        isLoading={false}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

export default function CompanyProfilePage() {
  return (
    <PrivateRoute>
      <CompanyProfileContent />
    </PrivateRoute>
  )
}