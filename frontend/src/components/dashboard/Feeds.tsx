// src/components/dashboard/Feeds.tsx
// Alerts, recent activity, setup checklist and performance figures for the dashboard.
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertOctagon, AlertTriangle, ArrowRight, ArrowRightLeft, Bell, Building2, CheckCircle2, Circle, Factory, Info, Package,
  ShoppingCart, Sparkles, TrendingDown, TrendingUp, UserPlus,
} from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActivityItem, Alert, PerformanceMetric, SetupProgress } from '@/types/dashboard.types'

const ALERT_STYLE: Record<Alert['type'], { icon: typeof Info; className: string }> = {
  critical: { icon: AlertOctagon, className: 'border-danger/30 bg-danger-soft text-danger' },
  warning: { icon: AlertTriangle, className: 'border-warning/40 bg-warning-soft text-warning' },
  info: { icon: Info, className: 'border-info/30 bg-info-soft text-info' },
  success: { icon: CheckCircle2, className: 'border-success/30 bg-success-soft text-success' },
}

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  return (
    <Panel icon={Bell} title="Needs attention" description={alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'item' : 'items'}` : undefined} delay={0.15}>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-4 w-4" /></span>
          <span className="text-muted-foreground">All clear. Nothing needs your attention.</span>
        </div>
      ) : (
        <AppStagger className="space-y-2.5">
          {alerts.map((a) => {
            const style = ALERT_STYLE[a.type] ?? ALERT_STYLE.info
            const Icon = style.icon
            const body = (
              <div className={cn('group flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-transform', style.className, a.href && 'hover:-translate-y-0.5')}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="opacity-90">{a.message}</p>
                </div>
                {a.href && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />}
              </div>
            )
            return (
              <AppStaggerItem key={a.id}>
                {a.href ? <Link href={a.href} aria-label={`${a.title}: ${a.action}`}>{body}</Link> : body}
              </AppStaggerItem>
            )
          })}
        </AppStagger>
      )}
    </Panel>
  )
}

const ACTIVITY_ICON: Record<string, { icon: typeof Info; className: string }> = {
  user_joined: { icon: UserPlus, className: 'bg-info-soft text-info' },
  company_created: { icon: Building2, className: 'bg-brand-soft text-brand' },
  product_added: { icon: Package, className: 'bg-brand-soft text-brand' },
  order_created: { icon: ShoppingCart, className: 'bg-warning-soft text-warning' },
  stock_movement: { icon: Package, className: 'bg-muted text-muted-foreground' },
  production_completed: { icon: Factory, className: 'bg-success-soft text-success' },
  transfer_completed: { icon: ArrowRightLeft, className: 'bg-info-soft text-info' },
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Panel icon={Sparkles} title="Recent activity" description="Last 7 days" delay={0.2} bodyClassName="p-0">
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Activity shows up here as your team works: stock moves, orders, transfers and production.</p>
      ) : (
        <ol className="relative px-4 py-3 sm:px-5">
          <span aria-hidden className="absolute bottom-5 left-[2.15rem] top-5 w-px bg-border sm:left-[2.4rem]" />
          {items.map((item, i) => {
            const style = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.stock_movement
            const Icon = style.icon
            const content = (
              <>
                <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card', style.className)}><Icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm leading-snug">{item.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(item.timestamp)}{item.user?.name ? ` · ${item.user.name}` : ''}</p>
                </div>
              </>
            )
            return (
              <motion.li key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}>
                {item.href ? (
                  <Link href={item.href} className="-mx-2 flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">{content}</Link>
                ) : (
                  <div className="flex gap-3 py-2">{content}</div>
                )}
              </motion.li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

const SETUP_LINKS: Record<string, string> = {
  'Add Team Members': '/company/users',
  'Set up Inventory': '/inventory',
  'Create First Order': '/distribution/orders/new',
  'Configure Billing': '/billing/payment-methods',
}

export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const pct = (progress.completed_steps / Math.max(1, progress.total_steps)) * 100
  return (
    <div id="setup" className="scroll-mt-24">
      <Panel icon={Sparkles} title="Finish setting up" description={`${progress.completed_steps} of ${progress.total_steps} done`} delay={0.12}>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {progress.steps.map((s) => {
            const href = SETUP_LINKS[s.title]
            const row = (
              <span className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors', s.completed ? 'bg-muted/40' : 'hover:border-brand/40 hover:bg-brand-soft/40')}>
                {s.completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0">
                  <span className={cn('block font-medium', s.completed && 'text-muted-foreground line-through')}>{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{s.description}</span>
                </span>
              </span>
            )
            return <li key={s.id}>{!s.completed && href ? <Link href={href}>{row}</Link> : row}</li>
          })}
        </ul>
      </Panel>
    </div>
  )
}

export function MetricsStrip({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <AppStagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((m) => {
        const hasChange = m.change && m.change !== '—'
        const good = m.trend === 'up'
        return (
          <AppStaggerItem key={m.title}>
            <div className="h-full rounded-xl border bg-card p-4" title={m.description}>
              <p className="text-xs font-medium text-muted-foreground">{m.title}</p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight">{m.value}</p>
              <p className={cn('mt-1 flex items-center gap-1 text-xs', !hasChange ? 'text-muted-foreground' : good ? 'text-success' : 'text-danger')}>
                {hasChange && (good ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)}
                {hasChange ? `${m.change} vs previous 30 days` : m.description}
              </p>
            </div>
          </AppStaggerItem>
        )
      })}
    </AppStagger>
  )
}
