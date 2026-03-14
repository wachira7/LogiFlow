// frontend/src/components/platform-admin/SubscriptionOverview.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, TrendingUp, Users, DollarSign, Calendar, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { PlatformAnalytics } from '@/types/platform.types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface SubscriptionOverviewProps {
  analytics: PlatformAnalytics | null
  isLoading: boolean
}

export function SubscriptionOverview({ analytics, isLoading }: SubscriptionOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <LoadingSpinner size="lg" text="Loading subscription data..." />
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No subscription data available
        </CardContent>
      </Card>
    )
  }

  const subscriptions = analytics.subscription_breakdown
  const totalSubscriptions = Object.values(subscriptions).reduce((sum, count) => sum + count, 0)

  const getSubscriptionIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'trialing':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'past_due':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'canceled':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  const getSubscriptionColor = (status: string) => {
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
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const calculatePercentage = (count: number) => {
    return totalSubscriptions > 0 ? (count / totalSubscriptions) * 100 : 0
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(totalSubscriptions)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {formatNumber(subscriptions.active || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculatePercentage(subscriptions.active || 0).toFixed(1)}% of total
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
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {formatCurrency(analytics.total_revenue / 12)}
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Average
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
                <p className="text-sm font-medium text-muted-foreground">Trial Users</p>
                <p className="text-3xl font-bold mt-2 text-blue-600">
                  {formatNumber(subscriptions.trialing || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculatePercentage(subscriptions.trialing || 0).toFixed(1)}% of total
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status Distribution</CardTitle>
          <CardDescription>Breakdown of all subscription statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(subscriptions).map(([status, count]) => {
              const percentage = calculatePercentage(count)
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getSubscriptionIcon(status)}
                      <div>
                        <p className="font-medium capitalize">{status.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {count} subscription{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getSubscriptionColor(status)}>
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Revenue Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(analytics.total_revenue)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Avg. Revenue per Company</span>
                <span className="text-xl font-bold">
                  {formatCurrency(analytics.total_companies > 0 ? analytics.total_revenue / analytics.total_companies : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Avg. Revenue per User</span>
                <span className="text-xl font-bold">
                  {formatCurrency(analytics.total_users > 0 ? analytics.total_revenue / analytics.total_users : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Paying Companies</span>
                <span className="text-xl font-bold">
                  {subscriptions.active || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Subscription Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-muted-foreground">Active Rate</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {calculatePercentage(subscriptions.active || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-muted-foreground">Trial Conversion</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {subscriptions.trialing > 0 
                    ? ((subscriptions.active / (subscriptions.active + subscriptions.trialing)) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-muted-foreground">Churn Rate</span>
                </div>
                <span className="text-xl font-bold text-red-600">
                  {calculatePercentage(subscriptions.canceled || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-muted-foreground">Retention Rate</span>
                </div>
                <span className="text-xl font-bold text-purple-600">
                  {totalSubscriptions > 0 
                    ? (((totalSubscriptions - (subscriptions.canceled || 0)) / totalSubscriptions) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
