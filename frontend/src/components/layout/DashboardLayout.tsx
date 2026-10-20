// src/components/layout/DashboardLayout.tsx
// The signed-in app shell (sidebar + top bar) shared by every module.
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Sidebar, type NavItem } from './Sidebar'
import { Navbar } from './Navbar'
import { RealtimeBridge } from '@/components/app/RealtimeBridge'
import { CommandPaletteProvider } from '@/components/app/CommandPalette'
import { DemoBanner } from '@/components/app/DemoBanner'
import { Logo } from '@/components/landing/Logo'
import { setCompanyCurrency } from '@/lib/format'

interface DashboardLayoutProps {
  children: React.ReactNode
  /** Custom sidebar menu (e.g. platform admin) */
  nav?: NavItem[]
  /** Strip shown above the top bar */
  banner?: React.ReactNode
}

export function DashboardLayout({ children, nav, banner }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  // Set during render (not in an effect) so pages format money in the company currency on first paint
  setCompanyCurrency(user?.company_currency)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Remember the collapsed rail between visits
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setSidebarCollapsed(JSON.parse(saved))
    } catch {
      /* storage unavailable */
    }
  }, [])

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(!prev))
      } catch {
        /* storage unavailable */
      }
      return !prev
    })
  }

  // Close the phone drawer after navigating
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <span className="animate-pulse"><Logo /></span>
        <span className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-1/2 animate-[shell-load_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </span>
      </div>
    )
  }

  // Not signed in: render nothing (middleware redirects to sign in)
  if (!isAuthenticated) {
    return null
  }

  const shell = (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-foreground">
        Skip to content
      </a>
      <Sidebar
        items={nav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* company app only: platform admins don't belong to a company */}
        {!nav && <RealtimeBridge />}
        {!nav && <DemoBanner />}
        {banner}
        <Navbar onMenuClick={() => setSidebarOpen(true)} sidebarCollapsed={sidebarCollapsed} />

        <main id="main" className="flex-1 overflow-y-auto">
          {/* Each page fades in as you move between them */}
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
  // The command palette searches company data, so it's for the company app only
  return nav ? shell : <CommandPaletteProvider>{shell}</CommandPaletteProvider>
}
