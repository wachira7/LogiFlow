// app/dashboard/page.tsx - FIXED VERSION
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { DashboardProvider } from '@/context/DashboardContext'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { SetupProgress } from '@/components/dashboard/SetupProgress'
import { useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function DashboardContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const hasRedirected = useRef(false) // Prevent multiple redirects

  // SINGLE CHECK - Run ONCE on mount
  useEffect(() => {
    console.log('🏠 Dashboard Page - Auth Check')
    console.log('Loading:', isLoading)
    console.log('User:', user?.email)
    console.log('Is Platform Admin:', user?.is_platform_admin)
    console.log('Has Redirected:', hasRedirected.current)

    if (!isLoading && user && !hasRedirected.current) {
      if (user.is_platform_admin || user.role === 'platform_admin') {
        console.log('🚀 Platform admin detected - redirecting to /platform-admin')
        hasRedirected.current = true // Mark as redirected
        router.push('/platform-admin')
      } else {
        console.log('✅ Regular user - staying on dashboard')
      }
    }
  }, [isLoading, user, router])

  //  LOADING STATE
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  //  PLATFORM ADMIN REDIRECT IN PROGRESS
  if (user?.is_platform_admin || user?.role === 'platform_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Redirecting to platform admin..." />
      </div>
    )
  }

  // NO COMPANY ERROR
  if (!user?.company_id) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No company associated with this account. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // ✅ RENDER REGULAR USER DASHBOARD
  return (
    <DashboardProvider>
      <div className="space-y-6">
        <WelcomeCard />
        <DashboardStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SetupProgress />
            <PerformanceCharts />
            <QuickActions />
          </div>
          
          <div className="space-y-6">
            <AlertsPanel />
            <RecentActivity />
          </div>
        </div>
      </div>
    </DashboardProvider>
  )
}

export default function DashboardPage() {
  return (
    <PrivateRoute>
      <DashboardContent />
    </PrivateRoute>
  )
}