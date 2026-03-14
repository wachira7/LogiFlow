// app/platform-admin/system-health/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { SystemHealth } from '@/components/platform-admin/SystemHealth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, Activity, AlertCircle } from 'lucide-react'

export default function SystemHealthPage() {
  const {
    healthDashboard,
    healthMetrics,
    isLoadingHealth,
    healthError,
    fetchHealthDashboard,
    fetchHealthMetrics,
    generateTestMetrics,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchHealthDashboard()
    fetchHealthMetrics()
  }, [fetchHealthDashboard, fetchHealthMetrics])

  if (healthError) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{healthError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Activity className="w-8 h-8" />
            <span>System Health</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time system performance and health metrics
          </p>
        </div>
      </div>

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