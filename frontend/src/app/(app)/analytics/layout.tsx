// src/app/(app)/analytics/layout.tsx
'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart3, Factory, LayoutGrid, Package, Truck, Warehouse } from 'lucide-react'
import { PageHeader } from '@/components/app/kit'
import { usePeriod } from '@/hooks/useAnalytics'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { title: 'Overview', href: '/analytics', icon: LayoutGrid },
  { title: 'Inventory', href: '/analytics/inventory', icon: Package },
  { title: 'Distribution', href: '/analytics/distribution', icon: Truck },
  { title: 'Production', href: '/analytics/production', icon: Factory },
  { title: 'Warehousing', href: '/analytics/warehousing', icon: Warehouse },
]

function PeriodPicker() {
  const { days, setDays, periods } = usePeriod()
  return (
    <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist" aria-label="Period">
      {periods.map((p) => (
        <button key={p} role="tab" aria-selected={days === p} onClick={() => setDays(p)}
          className={cn('relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', days === p ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
          {days === p && <motion.span layoutId="period" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="relative">{p} days</span>
        </button>
      ))}
    </div>
  )
}

function SectionNav() {
  const pathname = usePathname()
  const params = useSearchParams()
  const days = params.get('days')
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Analytics sections">
      <div className="inline-flex gap-1 border-b">
        {SECTIONS.map((s) => {
          const active = pathname === s.href
          const Icon = s.icon
          return (
            <Link key={s.href} href={days ? `${s.href}?days=${days}` : s.href} aria-current={active ? 'page' : undefined}
              className={cn('relative flex items-center gap-2 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-medium transition-colors', active ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-4 w-4" />{s.title}
              {active && <motion.span layoutId="analytics-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="How the business is moving, compared with the period before."
        actions={<Suspense fallback={null}><PeriodPicker /></Suspense>}
      />
      <Suspense fallback={null}>
        <SectionNav />
      </Suspense>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  )
}
