// src/app/platform-admin/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, BarChart3, Bell, Building2, LayoutDashboard, Layers, ScrollText, Settings, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import type { NavItem } from '@/components/layout/Sidebar'

const NAV: NavItem[] = [
  { title: 'Overview', href: '/platform-admin', icon: LayoutDashboard },
  { title: 'Companies', href: '/platform-admin/companies', icon: Building2 },
  { title: 'Subscriptions', href: '/platform-admin/subscriptions', icon: Layers },
  { title: 'Analytics', href: '/platform-admin/analytics', icon: BarChart3 },
  { title: 'System health', href: '/platform-admin/system-health', icon: Activity },
  { title: 'Notifications', href: '/platform-admin/notifications', icon: Bell },
  { title: 'Audit log', href: '/platform-admin/audit-logs', icon: ScrollText },
  { title: 'Settings', href: '/platform-admin/settings', icon: Settings },
]

const Banner = (
  <div className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-xs font-medium text-background">
    <Shield className="h-3.5 w-3.5" />Platform administrator mode: changes here affect every company
  </div>
)

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const isAdmin = !!user && (user.is_platform_admin || user.role === 'platform_admin')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace('/auth/login')
    else if (!isAdmin) router.replace('/dashboard')
  }, [isLoading, isAuthenticated, isAdmin, router])

  if (!isLoading && isAuthenticated && !isAdmin) return null
  return <DashboardLayout nav={NAV} banner={Banner}>{children}</DashboardLayout>
}
