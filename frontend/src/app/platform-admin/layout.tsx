// app/platform-admin/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { PlatformAdminSidebar } from '@/components/layout/PlatformAdminSidebar'
import { Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        router.push('/auth/login')
      } else if (!user.is_platform_admin && user.role !== 'platform_admin') {
        router.push('/dashboard')
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  // Show spinner while auth resolves
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner size="lg" text="Verifying platform admin access..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render nothing while redirect is in flight
  if (!isAuthenticated || !user || (!user.is_platform_admin && user.role !== 'platform_admin')) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Platform Administrator Mode</span>
          </div>
        </div>

        <Navbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}