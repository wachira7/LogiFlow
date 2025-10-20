// app/company/users/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { UserInvitations } from '@/components/company/UserInvitations'
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
  UserPlus,
  Building,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import type { Company, Invitation } from '@/types/company.types'

function CompanyUsersContent() {
  const [company, setCompany] = useState<Company | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [companyResponse, invitationsResponse] = await Promise.all([
        CompanyService.getCompany(),
        CompanyService.getInvitations()
      ])

      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data)
      }

      if (invitationsResponse.success && invitationsResponse.data) {
        setInvitations(Array.isArray(invitationsResponse.data) ? invitationsResponse.data : [])
      } else {
        setInvitations([])
        toast({
          variant: "destructive",
          title: "Failed to load invitations",
          description: invitationsResponse.error || "Unable to load team invitations",
        })
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

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading team data..." />
      </div>
    )
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted')
  const declinedInvitations = invitations.filter(inv => inv.status === 'declined')
  const expiredInvitations = invitations.filter(inv => inv.status === 'expired')
  const revokedInvitations = invitations.filter(inv => inv.status === 'revoked')

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
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">
              Invite team members and manage user access to your company
            </p>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="flex space-x-2">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
          <Link href="/company/profile">
            <Button variant="outline" size="sm">
              <Building className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </Link>
          <Link href="/company/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{company?.users_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{acceptedInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Declined</p>
                <p className="text-2xl font-bold">{declinedInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Expired/Revoked</p>
                <p className="text-2xl font-bold">{expiredInvitations.length + revokedInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Info Card */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>{company.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={company.logo} alt={company.name} />
                <AvatarFallback>
                  {company.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline">{company.industry}</Badge>
                  <Badge variant="secondary">{company.users_count} members</Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{company.email}</span>
                  </div>
                </div>

                {/* {company.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{company.description}</p>
                )} */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations Alert */}
      {pendingInvitations.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-yellow-700">
                  These team members haven&apos;t responded to their invitations yet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* User Invitations Component */}
      <UserInvitations 
        invitations={invitations}
        isLoading={false}
        onRefresh={loadData}
      />
    </div>
  )
}

export default function CompanyUsersPage() {
  return (
    <PrivateRoute>
      <CompanyUsersContent />
    </PrivateRoute>
  )
}