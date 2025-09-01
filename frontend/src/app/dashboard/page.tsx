// app/dashboard/page.tsx - Updated with DashboardProvider
'use client'

import { PrivateRoute } from '@/components/auth/AuthGuard'
import { DashboardProvider } from '@/context/DashboardContext'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { SetupProgress } from '@/components/dashboard/SetupProgress'

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <WelcomeCard />
      
      {/* Key Stats */}
      <DashboardStats />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - spans 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <SetupProgress />
          <PerformanceCharts />
          <QuickActions />
        </div>
        
        {/* Right Column - spans 1 column on large screens */}
        <div className="space-y-6">
          <AlertsPanel />
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <PrivateRoute>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </PrivateRoute>
  )
}