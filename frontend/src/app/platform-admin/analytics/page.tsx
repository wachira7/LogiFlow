// frontend/src/app/platform-admin/analytics/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
//import { PrivateRoute } from '@/components/auth/AuthGuard'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { PlatformAnalyticsComponent } from '@/components/platform-admin/PlatformAnalytics'
import { SubscriptionOverview } from '@/components/platform-admin/SubscriptionOverview'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function AnalyticsPageContent() {
  const {
    analytics,
    isLoadingAnalytics,
    analyticsError,
    fetchAnalytics,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (analyticsError) {
    return (
      <div className="container mx-auto py-6">
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
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Loading analytics..." />
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
          <Link href="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <TrendingUp className="w-8 h-8" />
              <span>Platform Analytics</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights and metrics for your SaaS platform
            </p>
          </div>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={isLoadingAnalytics}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Platform Analytics */}
      <PlatformAnalyticsComponent 
        analytics={analytics}
        isLoading={isLoadingAnalytics}
      />

      {/* Subscription Overview */}
      <SubscriptionOverview
        analytics={analytics}
        isLoading={isLoadingAnalytics}
      />
    </div>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsPageContent />
}
