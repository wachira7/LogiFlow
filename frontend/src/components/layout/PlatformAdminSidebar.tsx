// components/layout/PlatformAdminSidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  TrendingUp,
  Activity,
  FileText,
  CreditCard,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlatformAdminSidebarProps {
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const platformAdminNavigation = [
  {
    name: 'Dashboard',
    href: '/platform-admin',
    icon: LayoutDashboard,
    description: 'Platform overview',
  },
  {
    name: 'Companies',
    href: '/platform-admin/companies',
    icon: Building2,
    description: 'Manage companies',
  },
  {
    name: 'Analytics',
    href: '/platform-admin/analytics',
    icon: TrendingUp,
    description: 'Platform metrics',
  },
  {
    name: 'System Health',
    href: '/platform-admin/system-health',
    icon: Activity,
    description: 'Monitor system',
  },
  {
    name: 'Audit Logs',
    href: '/platform-admin/audit-logs',
    icon: FileText,
    description: 'Security logs',
  },
  {
    name: 'Subscriptions',
    href: '/platform-admin/subscriptions',
    icon: CreditCard,
    description: 'Billing & plans',
  },
  {
    name: 'Notifications',
    href: '/platform-admin/notifications',
    icon: Bell,
    description: 'Platform alerts',
  },
  {
    name: 'Settings',
    href: '/platform-admin/settings',
    icon: Settings,
    description: 'Platform config',
  },
]

export function PlatformAdminSidebar({
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: PlatformAdminSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'PA'
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <Link href="/platform-admin" className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl">Admin</span>
            </Link>
          )}
          
          {collapsed && (
            <Shield className="w-6 h-6 text-primary mx-auto" />
          )}

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {platformAdminNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={cn('w-5 h-5', !collapsed && 'mr-3')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User Profile */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Avatar className={cn('h-8 w-8', !collapsed && 'mr-3')}>
                  <AvatarImage src={user?.profile_picture} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {user?.first_name || user?.email}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      Platform Admin
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle - Desktop only */}
        {onToggleCollapse && (
          <div className="hidden lg:block p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="w-full"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4 mr-2" />
              )}
              {!collapsed && <span className="text-xs">Collapse</span>}
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}