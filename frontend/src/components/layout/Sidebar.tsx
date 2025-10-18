// src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth, useAuthUtils } from '@/hooks/useAuth'
import { LayoutDashboard, Package, Truck, Factory, Warehouse, BarChart3, CreditCard, Settings, Users, Building, ChevronDown, ChevronRight, X, Menu, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
  roles?: string[]
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { hasAnyRole, isCompanyOwner, getUserDisplayName } = useAuthUtils()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard'])

  const toggleExpanded = (item: string) => {
    if (collapsed) return // Don't expand items when sidebar is collapsed
    setExpandedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }

  const navigation: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Inventory',
      href: '/inventory',
      icon: Package,
      children: [
        { title: 'Products', href: '/inventory/products', icon: Package },
        { title: 'Categories', href: '/inventory/categories', icon: Package },
        { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
        { title: 'Transactions', href: '/inventory/transactions', icon: Package },
        { title: 'Reports', href: '/inventory/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Distribution',
      href: '/distribution',
      icon: Truck,
      children: [
        { title: 'Orders', href: '/distribution/orders', icon: Package },
        { title: 'Shipments', href: '/distribution/shipments', icon: Truck },
        { title: 'Routes', href: '/distribution/routes', icon: Truck },
        { title: 'Tracking', href: '/distribution/tracking', icon: BarChart3 },
      ],
    },
    {
      title: 'Production',
      href: '/production',
      icon: Factory,
      roles: ['company_owner', 'production_manager'],
      children: [
        { title: 'Orders', href: '/production/orders', icon: Factory },
        { title: 'Materials', href: '/production/materials', icon: Package },
        { title: 'Steps', href: '/production/steps', icon: Factory },
      ],
    },
    {
      title: 'Warehousing',
      href: '/warehousing',
      icon: Warehouse,
      roles: ['company_owner', 'warehouse_manager'],
      children: [
        { title: 'Movements', href: '/warehousing/movements', icon: Warehouse },
        { title: 'Transfers', href: '/warehousing/transfers', icon: Truck },
        { title: 'Reports', href: '/warehousing/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      children: [
        { title: 'Inventory', href: '/analytics/inventory', icon: Package },
        { title: 'Distribution', href: '/analytics/distribution', icon: Truck },
        { title: 'Production', href: '/analytics/production', icon: Factory },
        { title: 'Financial', href: '/analytics/financial', icon: CreditCard },
      ],
    },
    {
      title: 'Billing',
      href: '/billing',
      icon: CreditCard,
      roles: ['company_owner'],
      children: [
        { title: 'Plans', href: '/billing/plans', icon: CreditCard },
        { title: 'Subscriptions', href: '/billing/subscriptions', icon: CreditCard },
        { title: 'Payment Methods', href: '/billing/payment-methods', icon: CreditCard },
        { title: 'Transactions', href: '/billing/transactions', icon: BarChart3 },
      ],
    },
    {
      title: 'Company',
      href: '/company',
      icon: Building,
      roles: ['company_owner'],
      children: [
        { title: 'Profile', href: '/company/profile', icon: Building },
        { title: 'Users', href: '/company/users', icon: Users },
      ],
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      children: [
        { title: 'General', href: '/settings/general', icon: Settings },
        { title: 'Security', href: '/settings/security', icon: Settings },
        { title: 'Notifications', href: '/settings/notifications', icon: Settings },
        { title: 'Integrations', href: '/settings/integrations', icon: Settings },
      ],
    },
  ]

  // Filter navigation based on user roles
  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return hasAnyRole(item.roles)
  })

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title.toLowerCase())

    const NavContent = () => (
      <div
        className={cn(
          'flex items-center w-full text-left rounded-lg transition-all duration-200',
          level === 0 ? (collapsed ? 'px-2 py-2' : 'px-3 py-2') : 'px-6 py-1.5',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.title.toLowerCase())}
            className="flex items-center w-full"
          >
            <item.icon className={cn('h-4 w-4 flex-shrink-0', !collapsed && (level === 0 ? 'mr-3' : 'mr-2'))} />
            {!collapsed && (
              <>
                <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </button>
        ) : (
          <Link 
            href={item.href} 
            className="flex items-center w-full" 
            onClick={onClose}
          >
            <item.icon className={cn('h-4 w-4 flex-shrink-0', !collapsed && (level === 0 ? 'mr-3' : 'mr-2'))} />
            {!collapsed && (
              <>
                <span className="text-sm font-medium truncate">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        )}
      </div>
    )

    return (
      <div key={item.href}>
        {collapsed && level === 0 ? (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <NavContent />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <NavContent />
        )}

        {/* Render children if expanded and not collapsed */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-64'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarWidth,
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            'flex items-center border-b transition-all duration-300',
            collapsed ? 'justify-center p-2' : 'justify-between p-4'
          )}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="text-lg font-bold whitespace-nowrap">LogiFlow</span>
              )}
            </div>
            
            {/* Desktop collapse toggle */}
            <div className="hidden lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          {!collapsed && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary-foreground">
                    {getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed user avatar */}
          {collapsed && (
            <div className="p-2 border-b flex justify-center">
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <nav className={cn('space-y-1 pb-4', collapsed ? 'px-2 py-2' : 'px-3 py-2')}>
                {filteredNavigation.map(item => renderNavItem(item))}
              </nav>
            </ScrollArea>
          </div>

          {/* Add separator before footer if company owner */}
          {isCompanyOwner() && <Separator className="mx-4" />}

          {/* Footer */}
          <div className={cn(
            'border-t transition-all duration-300',
            collapsed ? 'p-2' : 'p-4'
          )}>
            {/* Company owner admin button */}
            {isCompanyOwner() && !collapsed && (
              <div className="mb-3">
                <Separator className="mb-3" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Menu className="h-4 w-4 mr-2" />
                  Admin Menu
                </Button>
              </div>
            )}

            {/* Collapsed admin button */}
            {isCompanyOwner() && collapsed && (
              <div className="mb-3 flex justify-center">
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Admin Menu
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Version info */}
            {!collapsed && (
              <div className="text-xs text-muted-foreground text-center">
                <p>LogiFlow v1.0</p>
                <p>© 2025 WaruTech</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}