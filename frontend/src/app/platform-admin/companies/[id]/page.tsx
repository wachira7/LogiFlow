// frontend/src/app/platform-admin/companies/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
//import { PrivateRoute } from '@/components/auth/AuthGuard'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, Building2, Users, DollarSign, Calendar, Activity, AlertCircle, CheckCircle, Ban } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { CompanyOverview } from '@/types/platform.types'
import { formatCurrency, formatDate } from '@/lib/utils'

function CompanyDetailContent() {
  const params = useParams()
  const companyId = params.id as string
  
  const {
    companies,
    isLoadingCompanies,
    companiesError,
    fetchCompanies,
  } = usePlatformAdmin()

  const [company, setCompany] = useState<CompanyOverview | null>(null)

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies()
    }
  }, [companies.length, fetchCompanies])

  useEffect(() => {
    const foundCompany = companies.find(c => c.company_id === companyId)
    setCompany(foundCompany || null)
  }, [companies, companyId])

  if (companiesError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{companiesError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoadingCompanies || !company) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Loading company details..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/platform-admin/companies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Companies
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Building2 className="w-8 h-8" />
              <span>{company.company_name}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Company ID: {company.company_id}
            </p>
          </div>
        </div>
        <Badge variant={company.is_active ? 'default' : 'destructive'} className="text-lg px-4 py-2">
          {company.is_active ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Active</>
          ) : (
            <><Ban className="w-4 h-4 mr-2" /> Inactive</>
          )}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{company.user_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(company.total_revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p className="text-sm font-medium">
                  {formatDate(company.last_activity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">
                  {formatDate(company.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic company details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-medium">{company.company_name}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Company ID</span>
                <span className="font-mono text-sm">{company.company_id}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={company.is_active ? 'default' : 'destructive'}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subscription</span>
                <Badge>{company.subscription_status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Platform usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Total Users</span>
                <span className="text-xl font-bold">{company.user_count}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(company.total_revenue)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Last Activity</span>
                <span className="text-sm">{formatDate(company.last_activity)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(company.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CompanyDetailPage() {
  return <CompanyDetailContent />
}
