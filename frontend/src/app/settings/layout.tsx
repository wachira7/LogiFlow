// app/settings/layout.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Settings, User, Shield, Bell, Plug } from 'lucide-react'

const settingsNavigation = [
  {
    name: 'General',
    href: '/settings/general',
    icon: User,
    description: 'Profile and preferences',
  },
  {
    name: 'Security',
    href: '/settings/security',
    icon: Shield,
    description: 'Password and authentication',
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Email and push notifications',
  },
  {
    name: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
    description: 'Third-party connections',
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card className="p-2">
              <nav className="space-y-1">
                {settingsNavigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-start space-x-3 rounded-lg px-3 py-2 transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </DashboardLayout>
  )
}
