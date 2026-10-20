// src/components/layout/Sidebar.tsx
'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth, useAuthUtils } from '@/hooks/useAuth'
import {
  LayoutDashboard, Package, Truck, Factory, Warehouse, BarChart3, CreditCard, Settings, Users, Building,
  ChevronDown, X, ChevronLeft, ChevronRight, Shield, TrendingUp, Building2, User, Boxes, Tags, History,
  ArrowRightLeft, Route, MapPin, ClipboardList, Layers, ListChecks, Wallet, Receipt, Bell, Lock, Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Logo } from '@/components/landing/Logo'

interface SidebarProps {
  /** Menu to show; defaults to the company app menu */
  items?: NavItem[]
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
  roles?: string[]
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Inventory', href: '/inventory', icon: Package,
    children: [
      { title: 'Overview', href: '/inventory', icon: Home },
      { title: 'Products', href: '/inventory/products', icon: Package },
      { title: 'Stock', href: '/inventory/inventory-items', icon: Boxes },
      { title: 'Categories', href: '/inventory/categories', icon: Tags },
      { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
      { title: 'Movements', href: '/inventory/transactions', icon: History },
      { title: 'Reports', href: '/inventory/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Distribution', href: '/distribution', icon: Truck,
    children: [
      { title: 'Overview', href: '/distribution', icon: Home },
      { title: 'Orders', href: '/distribution/orders', icon: ClipboardList },
      { title: 'Shipments', href: '/distribution/shipments', icon: Truck },
      { title: 'Routes', href: '/distribution/routes', icon: Route },
      { title: 'Tracking', href: '/distribution/tracking', icon: MapPin },
    ],
  },
  {
    title: 'Production', href: '/production', icon: Factory,
    roles: ['company_owner', 'production_manager'],
    children: [
      { title: 'Overview', href: '/production', icon: Home },
      { title: 'Orders', href: '/production/orders', icon: ClipboardList },
      { title: 'Materials', href: '/production/materials', icon: Layers },
      { title: 'Work queue', href: '/production/steps', icon: ListChecks },
    ],
  },
  {
    title: 'Warehousing', href: '/warehousing', icon: Warehouse,
    roles: ['company_owner', 'warehouse_manager'],
    children: [
      { title: 'Overview', href: '/warehousing', icon: Home },
      { title: 'Transfers', href: '/warehousing/transfers', icon: ArrowRightLeft },
      { title: 'Movements', href: '/warehousing/movements', icon: Route },
      { title: 'Reports', href: '/warehousing/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Analytics', href: '/analytics', icon: BarChart3,
    children: [
      { title: 'Overview', href: '/analytics', icon: Home },
      { title: 'Inventory', href: '/analytics/inventory', icon: Package },
      { title: 'Distribution', href: '/analytics/distribution', icon: Truck },
      { title: 'Production', href: '/analytics/production', icon: Factory },
      { title: 'Warehousing', href: '/analytics/warehousing', icon: Warehouse },
    ],
  },
  {
    title: 'Billing', href: '/billing', icon: CreditCard,
    roles: ['company_owner'],
    children: [
      { title: 'Overview', href: '/billing', icon: Home },
      { title: 'Plans', href: '/billing/plans', icon: Layers },
      { title: 'Subscriptions', href: '/billing/subscriptions', icon: CreditCard },
      { title: 'Payment Methods', href: '/billing/payment-methods', icon: Wallet },
      { title: 'Transactions', href: '/billing/transactions', icon: Receipt },
    ],
  },
  {
    title: 'Company', href: '/company', icon: Building,
    roles: ['company_owner'],
    children: [
      { title: 'Profile', href: '/company/profile', icon: Building },
      { title: 'Team', href: '/company/users', icon: Users },
      { title: 'Settings', href: '/company/settings', icon: Settings },
    ],
  },
  {
    title: 'Platform Admin', href: '/platform-admin', icon: Shield,
    roles: ['platform_admin'],
    children: [
      { title: 'Dashboard', href: '/platform-admin', icon: LayoutDashboard },
      { title: 'Analytics', href: '/platform-admin/analytics', icon: TrendingUp },
      { title: 'Companies', href: '/platform-admin/companies', icon: Building2 },
      { title: 'Subscriptions', href: '/platform-admin/subscriptions', icon: CreditCard },
      { title: 'Settings', href: '/platform-admin/settings', icon: Settings },
    ],
  },
  {
    title: 'Settings', href: '/settings', icon: Settings,
    children: [
      { title: 'Profile', href: '/settings/general', icon: User },
      { title: 'Security', href: '/settings/security', icon: Lock },
      { title: 'Notifications', href: '/settings/notifications', icon: Bell },
    ],
  },
]

const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')

/** A section owns the current page if any of its links (or its own href) contains it. */
const sectionOwns = (item: NavItem, pathname: string) =>
  within(pathname, item.href) || !!item.children?.some((c) => within(pathname, c.href))

/** The single most specific link that matches the current page. */
function activeHref(pathname: string, items: NavItem[]) {
  let best = ''
  for (const item of items) {
    for (const link of [item, ...(item.children ?? [])]) {
      if (within(pathname, link.href) && link.href.length > best.length) best = link.href
    }
  }
  return best
}

const desktopQuery = '(min-width: 1024px)'
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(desktopQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function Sidebar({ items: customItems, open, onClose, collapsed: collapsedPref, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  // The icon-only rail is a desktop preference; the phone drawer always shows labels
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true)
  const collapsed = collapsedPref && isDesktop
  const reduce = useReducedMotion()
  const { hasAnyRole, getUserDisplayName } = useAuthUtils()
  const { user } = useAuth()

  const source = customItems ?? navigation
  const items = source.filter((item) => !item.roles || hasAnyRole(item.roles))
  const current = activeHref(pathname, items)
  const [expanded, setExpanded] = useState<string[]>([])

  // Open the section that holds the current page
  useEffect(() => {
    const owner = source.find((item) => item.children && sectionOwns(item, pathname))
    if (owner) setExpanded((prev) => (prev.includes(owner.title) ? prev : [...prev, owner.title]))
  }, [pathname, source])

  const toggle = (title: string) =>
    setExpanded((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]))

  const initials = getUserDisplayName().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const leafClass = (active: boolean) =>
    cn(
      'relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200',
      active ? 'text-brand' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const activePill = (
    <motion.span
      layoutId="sidebar-active"
      className="absolute inset-0 -z-10 rounded-lg bg-brand-soft ring-1 ring-brand/15"
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
    />
  )

  const withTooltip = (title: string, node: React.ReactNode) =>
    collapsed ? (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{title}</TooltipContent>
      </Tooltip>
    ) : (
      node
    )

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const owns = sectionOwns(item, pathname)

    // Plain link, or any section while the rail is collapsed (goes to the section's first page)
    if (!item.children || collapsed) {
      const href = item.children ? item.children[0].href : item.href
      const active = item.children ? owns : current === item.href
      return (
        <div key={item.title}>
          {withTooltip(
            item.title,
            <Link
              href={href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(leafClass(active), 'isolate', collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2')}
            >
              {active && activePill}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
              {!collapsed && item.badge && <Badge variant="secondary" className="ml-auto">{item.badge}</Badge>}
            </Link>,
          )}
        </div>
      )
    }

    const isOpen = expanded.includes(item.title)
    return (
      <div key={item.title}>
        <button
          type="button"
          onClick={() => toggle(item.title)}
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted',
            owns ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', owns && 'text-brand')} />
          <span className="flex-1 truncate text-left">{item.title}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-300', isOpen ? 'rotate-0' : '-rotate-90')} />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="ml-5 mt-1 space-y-0.5 border-l pl-2.5">
                {item.children.map((child) => {
                  const ChildIcon = child.icon
                  const active = current === child.href
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(leafClass(active), 'isolate px-2.5 py-1.5')}
                    >
                      {active && activePill}
                      <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{child.title}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:relative lg:translate-x-0',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          open ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={cn('flex h-16 items-center border-b', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
          <Link href="/dashboard" onClick={onClose} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Logo showWordmark={!collapsed} />
          </Link>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn('hidden h-8 w-8 lg:inline-flex', collapsed && 'absolute -right-4 top-4 z-10 h-7 w-7 rounded-full border bg-card shadow-sm')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <nav className={cn('space-y-1 py-3', collapsed ? 'px-2' : 'px-3')}>
              {items.map(renderItem)}
            </nav>
          </ScrollArea>
        </div>

        {/* Signed-in user */}
        <div className={cn('border-t', collapsed ? 'p-2' : 'p-3')}>
          {withTooltip(
            `${getUserDisplayName()} · ${user?.email ?? ''}`,
            <Link
              href="/settings/general"
              onClick={onClose}
              className={cn('flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted', collapsed && 'justify-center')}
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-brand/20">
                <AvatarImage src={user?.profile_picture || user?.avatar || undefined} />
                <AvatarFallback className="bg-brand text-sm font-medium text-brand-foreground">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.company_name || user?.email}</p>
                </div>
              )}
            </Link>,
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
