// app/platform-admin/page.tsx - FIXED VERSION
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { useAuth } from '@/hooks/useAuth'
import { PlatformAnalyticsComponent } from '@/components/platform-admin/PlatformAnalytics'
import { SystemHealth } from '@/components/platform-admin/SystemHealth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LayoutDashboard, Building2, Users, Settings, Activity, TrendingUp, ArrowRight, Shield, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function PlatformAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  const {
    analytics,
    isLoadingAnalytics,
    analyticsError,
    healthDashboard,
    healthMetrics,
    isLoadingHealth,
    fetchAnalytics,
    fetchHealthDashboard,
    fetchHealthMetrics,
    generateTestMetrics,
  } = usePlatformAdmin()

  // ✅ SINGLE AUTH CHECK - Only redirect if NOT platform admin
  useEffect(() => {
    console.log('🔐 Platform Admin Page - Auth Check')
    console.log('Auth Loading:', authLoading)
    console.log('Is Authenticated:', isAuthenticated)
    console.log('User:', user?.email)
    console.log('Is Platform Admin:', user?.is_platform_admin)
    console.log('Role:', user?.role)

    if (!authLoading) {
      if (!isAuthenticated || !user) {
        console.log('❌ Not authenticated - redirecting to login')
        router.push('/auth/login')
      } else if (!user.is_platform_admin && user.role !== 'platform_admin') {
        console.log('❌ Not platform admin - redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('✅ Platform admin authenticated - staying on page')
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  // ✅ FETCH DATA only when user is confirmed platform admin
  useEffect(() => {
    if (user?.is_platform_admin || user?.role === 'platform_admin') {
      console.log('📊 Fetching platform admin data...')
      fetchAnalytics()
      fetchHealthDashboard()
      fetchHealthMetrics()
    }
  }, [user, fetchAnalytics, fetchHealthDashboard, fetchHealthMetrics])

  // ✅ LOADING STATE
  if (authLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Verifying platform admin access..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  // NOT AUTHENTICATED
  if (!isAuthenticated || !user) {
    return null // Router will handle redirect
  }

  // NOT PLATFORM ADMIN
  if (!user.is_platform_admin && user.role !== 'platform_admin') {
    return null // Router will handle redirect
  }

  // ERROR STATE
  if (analyticsError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Analytics</AlertTitle>
          <AlertDescription>{analyticsError}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => fetchAnalytics()} 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  // LOADING DATA
  if (isLoadingAnalytics && !analytics) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Loading platform dashboard..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  // RENDER DASHBOARD
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
            <LayoutDashboard className="w-8 h-8" />
            <span>Platform Admin Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.first_name || user.email} - Manage your entire SaaS platform
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          Super Admin
        </Badge>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/platform-admin/companies">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Companies</p>
                    <p className="text-3xl font-bold mt-2">{analytics.total_companies}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {analytics.active_companies} active
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600">
                  <span>View all companies</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{analytics.total_users}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {analytics.active_users} active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/platform-admin/analytics">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold mt-2 text-green-600">
                      ${(analytics.total_revenue / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Growing
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <span>View analytics</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Health</p>
                  <p className="text-2xl font-bold mt-2">
                    {healthDashboard?.overall_status || 'LOADING'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {healthDashboard ? `${healthDashboard.uptime_percentage.toFixed(2)}% uptime` : 'Checking...'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/platform-admin/companies">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Building2 className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Manage Companies</p>
                  <p className="text-xs text-muted-foreground">View and manage all companies</p>
                </div>
              </Button>
            </Link>

            <Link href="/platform-admin/settings">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Settings className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Platform Settings</p>
                  <p className="text-xs text-muted-foreground">Configure platform settings</p>
                </div>
              </Button>
            </Link>

            <Link href="/platform-admin/analytics">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <TrendingUp className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Platform insights & metrics</p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      <PlatformAnalyticsComponent 
        analytics={analytics}
        isLoading={isLoadingAnalytics}
      />

      {/* System Health */}
      <SystemHealth
        dashboard={healthDashboard}
        metrics={healthMetrics}
        isLoading={isLoadingHealth}
        onRefresh={() => {
          fetchHealthDashboard()
          fetchHealthMetrics()
        }}
        onGenerateTestMetrics={generateTestMetrics}
      />
    </div>
  )
}

export default function PlatformAdminPage() {
  return <PlatformAdminDashboard />
}