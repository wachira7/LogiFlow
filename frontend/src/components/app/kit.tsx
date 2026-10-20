// src/components/app/kit.tsx
// Building blocks shared by every module page: header, stat cards, status pills, panels and skeletons.
'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedNumber, AppStagger, AppStaggerItem, FadeIn } from './motion'

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const toneChip: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-muted text-muted-foreground',
}

const toneDot: Record<Tone, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

/** Page title row: icon chip, title, description and actions (actions wrap under the title on phones). */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  back,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <FadeIn className="space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm ring-1 ring-brand/15 sm:flex">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </FadeIn>
  )
}

/** Responsive grid that staggers its StatCards in. */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <AppStagger className={cn('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)}>{children}</AppStagger>
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  href,
  format,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone?: Tone
  hint?: React.ReactNode
  href?: string
  format?: (n: number) => string
}) {
  const body = (
    <div className={cn('group relative h-full overflow-hidden rounded-xl border bg-card p-4 sm:p-5', 'card-lift')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-[13px]">{label}</p>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110', toneChip[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      {href && (
        <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      )}
      <span className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100', toneDot[tone])} />
    </div>
  )
  return (
    <AppStaggerItem className="h-full">
      {href ? <Link href={href} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{body}</Link> : body}
    </AppStaggerItem>
  )
}

/** A status label with a coloured dot; `pulse` marks live states such as "in transit". */
export function StatusPill({ tone, children, pulse = false, className }: { tone: Tone; children: React.ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', toneChip[tone], className)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden', toneDot[tone])} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', toneDot[tone])} />
      </span>
      {children}
    </span>
  )
}

/** A titled card section that fades in. */
export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  delay = 0.1,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  delay?: number
}) {
  return (
    <FadeIn delay={delay} className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-brand" />}
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-semibold sm:text-base">{title}</h2>}
              {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {/* bodyClassName replaces the default padding rather than merging with it */}
      <div className={bodyClassName ?? 'p-4 sm:p-5'}>{children}</div>
    </FadeIn>
  )
}

/** Shortcut tile for "quick action" grids. */
export function ActionTile({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <AppStaggerItem>
      <Link href={href} className="group card-lift flex h-full items-start gap-3 rounded-xl border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-medium">
            {title}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        </span>
      </Link>
    </AppStaggerItem>
  )
}

export function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-busy aria-label="Loading">
      <div className="flex gap-4 border-b px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-4 py-4 last:border-0" style={{ opacity: 1 - r * 0.12 }}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-32')} />)}
        </div>
      ))}
    </div>
  )
}

/** Inline error banner with an optional retry. */
export function ErrorBanner({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <FadeIn>
      <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{title}</p>
          <p className="opacity-90">{message}</p>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="self-start rounded-md border border-danger/30 px-3 py-1 font-medium transition-colors hover:bg-danger hover:text-white sm:self-auto">
            Try again
          </button>
        )}
      </div>
    </FadeIn>
  )
}

/** Segmented filter chips with an animated highlight; scrolls sideways on small screens. */
export function FilterChips<T extends string>({ options, value, onChange, id }: {
  options: readonly (readonly [T, string])[]
  value: T
  onChange: (v: T) => void
  id: string
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist">
        {options.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
            className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === key ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
            {value === key && <motion.span layoutId={`chips-${id}`} className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
