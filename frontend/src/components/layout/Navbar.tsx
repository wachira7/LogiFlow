// src/components/layout/Navbar.tsx
// Top bar of the signed-in app: menu button (phones), breadcrumbs, theme, notifications and the account menu.
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, LogOut, Menu, Settings, Building, User, CreditCard } from 'lucide-react'
import { useAuth, useAuthUtils } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/landing/Logo'

interface NavbarProps {
  onMenuClick?: () => void
  sidebarCollapsed?: boolean
}

const LABELS: Record<string, string> = {
  'inventory-items': 'Stock',
  steps: 'Work queue',
  users: 'Team',
  general: 'Profile',
  'platform-admin': 'Platform admin',
  'payment-methods': 'Payment methods',
  'audit-logs': 'Audit logs',
  'system-health': 'System health',
  new: 'New',
  edit: 'Edit',
}

const titleCase = (segment: string) =>
  LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// IDs (UUIDs or long numbers) show as "Details" rather than raw identifiers
const isId = (segment: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d{4,}$/.test(segment)

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {segments.map((segment, i) => {
          const href = '/' + segments.slice(0, i + 1).join('/')
          const last = i === segments.length - 1
          const label = isId(segment) ? 'Details' : titleCase(segment)
          return (
            <li key={href} className={`flex min-w-0 items-center gap-1 ${i < segments.length - 2 ? 'hidden md:flex' : ''}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">{label}</span>
              ) : (
                <Link href={href} className="truncate text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const roleLabel = (role?: string) => (role ? role.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '')

export function Navbar({ onMenuClick }: NavbarProps = {}) {
  const { user, isLoading } = useAuth()
  const { logoutWithConfirmation, getUserInitials, isCompanyOwner } = useAuthUtils()
  const name = user ? user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : ''

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="-ml-2 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="LogiFlow home">
          <Logo showWordmark={false} />
        </Link>

        <div className="hidden min-w-0 flex-1 sm:block">
          <Breadcrumbs />
        </div>
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user && <NotificationBell />}
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Account menu">
                  <Avatar className="h-8 w-8 ring-2 ring-brand/20">
                    <AvatarImage src={user.profile_picture || user.avatar || undefined} alt={name} />
                    <AvatarFallback className="bg-brand text-xs text-brand-foreground">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden flex-col items-start leading-tight xl:flex">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel(user.role)}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/general"><User className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/security"><Settings className="mr-2 h-4 w-4" />Security</Link>
                </DropdownMenuItem>
                {isCompanyOwner() && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/company/settings"><Building className="mr-2 h-4 w-4" />Company settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/billing"><CreditCard className="mr-2 h-4 w-4" />Billing</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logoutWithConfirmation} className="text-danger focus:text-danger">
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  )
}
