// src/app/platform-admin/system-health/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Cpu, Plug, RefreshCw, XCircle } from 'lucide-react'
import { adminService, type Health, type HealthStatus } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner, PageHeader, Panel, StatusPill } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const ICON: Record<HealthStatus, typeof CheckCircle2> = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }
const TONE = { ok: 'success', warn: 'warning', fail: 'danger' } as const
const OVERALL = { HEALTHY: ['success', 'All systems working'], WARNING: ['warning', 'Working, with warnings'], CRITICAL: ['danger', 'Something is down'] } as const

function uptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

export default function SystemHealthPage() {
  const [h, setH] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setH(await adminService.health())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t run the checks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60_000)
    return () => clearInterval(t)
  }, [load])

  const overall = h ? OVERALL[h.overall_status] : null
  return (
    <div className="space-y-6">
      <PageHeader icon={Activity} title="System health" description="Measured live each time you open or refresh this page."
        actions={<Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Run checks</Button>} />
      {error && <ErrorBanner title="Couldn’t run the checks" message={error} onRetry={load} />}
      {!h ? <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></div> : (
        <>
          <FadeIn className={cn('flex flex-col gap-2 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between',
            overall![0] === 'success' ? 'border-success/30 bg-success-soft' : overall![0] === 'warning' ? 'border-warning/40 bg-warning-soft' : 'border-danger/30 bg-danger-soft')}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3"><span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden', `bg-${overall![0]}`)} /><span className={cn('relative inline-flex h-3 w-3 rounded-full', `bg-${overall![0]}`)} /></span>
              <p className="text-lg font-semibold">{overall![1]}</p>
            </div>
            <p className="text-xs text-muted-foreground">Checked {timeAgo(h.checked_at)}</p>
          </FadeIn>

          <AppStagger className="grid gap-4 sm:grid-cols-2">
            {h.checks.map((c) => {
              const Icon = ICON[c.status]
              return (
                <AppStaggerItem key={c.key}>
                  <div className="flex h-full items-start gap-3 rounded-xl border bg-card p-4">
                    <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', c.status === 'ok' ? 'text-success' : c.status === 'warn' ? 'text-warning' : 'text-danger')} />
                    <div className="min-w-0 flex-1"><p className="font-medium">{c.label}</p><p className="text-sm text-muted-foreground">{c.detail}</p></div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{c.latency_ms} ms</span>
                  </div>
                </AppStaggerItem>
              )
            })}
          </AppStagger>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={Plug} title="Providers" description="Set up or not, and in which mode. Keys are never shown." bodyClassName="p-0" delay={0.1}>
              <ul className="divide-y">
                {h.providers.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="font-medium">{p.label}</span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {p.configured ? <StatusPill tone={p.mode === 'live' ? 'success' : 'info'}>{p.mode}</StatusPill> : <StatusPill tone="warning">not set up</StatusPill>}
                      {p.webhook !== null && p.configured && <StatusPill tone={p.webhook ? 'neutral' : 'danger'}>{p.webhook ? 'callbacks verified' : 'callback secret missing'}</StatusPill>}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <div className="space-y-6">
              <Panel icon={AlertTriangle} title="Needs a look" delay={0.15}>
                <ul className="space-y-2 text-sm">
                  {[
                    ['Failed payments (24 h)', h.signals.failed_payments_24h, 'warn'],
                    ['Payments pending over an hour', h.signals.stuck_pending_payments, 'warn'],
                    ['Subscriptions with payment due', h.signals.past_due_subscriptions, 'warn'],
                  ].map(([label, n]) => (
                    <li key={label as string} className="flex items-center justify-between"><span>{label}</span><StatusPill tone={(n as number) ? 'warning' : 'success'}>{n as number}</StatusPill></li>
                  ))}
                </ul>
              </Panel>
              <Panel icon={Cpu} title="Runtime" delay={0.2}>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Python / Django</dt><dd className="font-medium">{h.runtime.python} / {h.runtime.django}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Server running for</dt><dd className="font-medium">{uptime(h.runtime.process_uptime_seconds)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Debug mode</dt><dd className={cn('font-medium', h.runtime.debug && 'text-warning')}>{h.runtime.debug ? 'On' : 'Off'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Release</dt><dd className="truncate font-medium">{h.runtime.release?.slice(0, 7) ?? '—'}</dd></div>
                </dl>
              </Panel>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Checks: {h.checks.map((c) => `${c.label} ${TONE[c.status] === 'success' ? '✓' : '!'}`).join(' · ')}</p>
        </>
      )}
    </div>
  )
}
