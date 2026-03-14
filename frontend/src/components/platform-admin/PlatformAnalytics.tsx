// frontend/src/components/platform-admin/PlatformAnalytics.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, DollarSign, TrendingUp, Activity, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { PlatformAnalytics } from '@/types/platform.types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface PlatformAnalyticsProps {
  analytics: PlatformAnalytics | null
  isLoading: boolean
}

export function PlatformAnalyticsComponent({ analytics, isLoading }: PlatformAnalyticsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <LoadingSpinner size="lg" text="Loading analytics..." />
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    )
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-600'
      case 'WARNING':
        return 'text-yellow-600'
      case 'CRITICAL':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5" />
      case 'WARNING':
        return <AlertCircle className="w-5 h-5" />
      case 'CRITICAL':
        return <XCircle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(analytics.total_companies)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.active_companies} active
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(analytics.total_users)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.active_users} active
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  Growing
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
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <div className={`text-2xl font-bold mt-2 flex items-center space-x-2 ${getHealthStatusColor(analytics.system_health_status)}`}>
                  {getHealthIcon(analytics.system_health_status)}
                  <span>{analytics.system_health_status}</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full ${
                analytics.system_health_status === 'HEALTHY' ? 'bg-green-100' :
                analytics.system_health_status === 'WARNING' ? 'bg-yellow-100' :
                'bg-red-100'
              } flex items-center justify-center`}>
                <Activity className={`w-6 h-6 ${getHealthStatusColor(analytics.system_health_status)}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Breakdown</CardTitle>
          <CardDescription>Current subscription status distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.subscription_breakdown).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-lg border">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground capitalize mt-1">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
          <CardDescription>Revenue over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.monthly_revenue.slice(-6).map((item, index) => (
              <div key={`${item.month}-${index}`} className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.month}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((item.revenue / Math.max(...analytics.monthly_revenue.map(m => m.revenue))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-24 text-right">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
          <CardDescription>Latest admin actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recent_activity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              analytics.recent_activity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{activity.action.replace(/_/g, ' ')}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">By: {activity.admin}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}