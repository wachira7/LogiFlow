// frontend/src/app/platform-admin/subscriptions/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { SubscriptionOverview } from '@/components/platform-admin/SubscriptionOverview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, CreditCard, AlertCircle, RefreshCw, TrendingUp, Users, DollarSign, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'

function SubscriptionsPageContent() {
  const {
    analytics,
    companies,
    isLoadingAnalytics,
    isLoadingCompanies,
    analyticsError,
    fetchAnalytics,
    fetchCompanies,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchAnalytics()
    fetchCompanies()
  }, [fetchAnalytics, fetchCompanies])

  const getSubscriptionStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-blue-100 text-blue-800'
      case 'past_due':
        return 'bg-orange-100 text-orange-800'
      case 'canceled':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'trialing':
        return <Clock className="w-4 h-4" />
      case 'canceled':
      case 'cancelled':
      case 'inactive':
        return <XCircle className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  if (analyticsError) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{analyticsError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoadingAnalytics && !analytics) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Loading subscription data..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <CreditCard className="w-8 h-8" />
              <span>Subscriptions & Billing</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage subscriptions, billing, and revenue across all companies
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            fetchAnalytics()
            fetchCompanies()
          }} 
          variant="outline" 
          size="sm" 
          disabled={isLoadingAnalytics || isLoadingCompanies}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAnalytics || isLoadingCompanies ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {formatCurrency(analytics.total_revenue)}
                  </p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    All time
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  <p className="text-3xl font-bold mt-2">
                    {analytics.subscription_breakdown.active || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paying customers
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trial Users</p>
                  <p className="text-3xl font-bold mt-2 text-blue-600">
                    {analytics.subscription_breakdown.trialing || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    On trial period
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MRR</p>
                  <p className="text-3xl font-bold mt-2 text-purple-600">
                    {formatCurrency(analytics.total_revenue / 12)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Monthly recurring
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Overview Component */}
      <SubscriptionOverview
        analytics={analytics}
        isLoading={isLoadingAnalytics}
      />

      {/* Company Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Subscriptions</CardTitle>
          <CardDescription>
            Detailed subscription information for all companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCompanies ? (
            <div className="p-8">
              <LoadingSpinner size="md" text="Loading companies..." />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Subscription Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.company_id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.company_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSubscriptionStatusColor(company.subscription_status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(company.subscription_status)}
                            <span className="capitalize">{company.subscription_status}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{company.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(company.total_revenue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(company.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(company.last_activity)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubscriptionsPage() {
  return  <SubscriptionsPageContent />
}
