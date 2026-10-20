// src/components/production/ProductionSteps.tsx
// The floor's work queue: steps being worked on, up next, and recently finished.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, ListChecks, Loader2, Play, Search, SkipForward, User, X } from 'lucide-react'
import { useProductionSteps } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StepStatusPill } from './status'
import type { ProductionStep } from '@/types/production.types'

type Lane = { key: string; title: string; hint: string; steps: ProductionStep[] }

export function ProductionSteps() {
  const { steps, error, fetchSteps, startStep, completeStep, skipStep } = useProductionSteps()
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(() => fetchSteps({ ordering: 'created_at' }).catch(() => {}).finally(() => setReady(true)), [fetchSteps])
  useEffect(() => {
    load()
  }, [load])

  const act = async (step: ProductionStep, action: 'start' | 'complete' | 'skip') => {
    setBusy(step.id)
    setActionError(null)
    try {
      await { start: startStep, complete: completeStep, skip: skipStep }[action](step.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(null)
    }
  }

  const lanes: Lane[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (s: ProductionStep) =>
      !q || [s.name, s.order_number, s.product_name, s.assigned_to_name].some((v) => v?.toLowerCase().includes(q))
    const all = (Array.isArray(steps) ? steps : []).filter(match)
    const live = all.filter((s) => s.order_status === 'IN_PROGRESS')
    return [
      { key: 'working', title: 'Working now', hint: 'Started and not finished', steps: live.filter((s) => s.status === 'IN_PROGRESS') },
      { key: 'next', title: 'Up next', hint: 'On orders in production', steps: live.filter((s) => s.status === 'PENDING') },
      {
        key: 'done', title: 'Recently finished', hint: 'Completed or skipped',
        steps: all.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED')
          .sort((a, b) => (b.end_time ?? '').localeCompare(a.end_time ?? '')).slice(0, 12),
      },
    ]
  }, [steps, query])

  const overdue = lanes[0].steps.filter((s) => s.is_overdue).length

  return (
    <div className="space-y-6">
      <PageHeader icon={ListChecks} title="Work queue" description="Every step on orders in production. Finishing a step starts the next one on that order." />

      {error && ready && <ErrorBanner title="Couldn’t load steps" message={error} onRetry={load} />}
      {actionError && <ErrorBanner title="Action failed" message={actionError} />}

      {!ready ? (
        <StatGridSkeleton count={3} className="lg:grid-cols-3" />
      ) : (
        <StatGrid className="lg:grid-cols-3">
          <StatCard label="Working now" value={lanes[0].steps.length} icon={Play} tone="info" hint={overdue ? `${overdue} over estimate` : 'All within estimate'} />
          <StatCard label="Up next" value={lanes[1].steps.length} icon={Clock} tone="warning" />
          <StatCard label="Recently finished" value={lanes[2].steps.length} icon={CheckCircle2} tone="success" />
        </StatGrid>
      )}

      <FadeIn delay={0.05} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search step, order, product, person…" className="bg-card pl-9 pr-9" aria-label="Search steps" />
        {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
      </FadeIn>

      {!ready ? (
        <TableSkeleton rows={5} cols={3} />
      ) : lanes.every((l) => l.steps.length === 0) ? (
        <EmptyState icon={<ListChecks />} title={query ? 'No matching steps' : 'Nothing on the floor'} description={query ? 'Try another search.' : 'Steps show up here once a production order with steps is started.'}
          action={!query ? <Button asChild variant="outline"><Link href="/production/orders">Go to production orders</Link></Button> : undefined} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {lanes.map((lane, li) => (
            <FadeIn key={lane.key} delay={0.08 + li * 0.06} className="flex flex-col rounded-xl border bg-muted/30">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{lane.title}</p>
                  <p className="text-xs text-muted-foreground">{lane.hint}</p>
                </div>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums shadow-sm">{lane.steps.length}</span>
              </div>
              <AppStagger className="flex-1 space-y-2 px-3 pb-3">
                {lane.steps.length === 0 && <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
                {lane.steps.map((s) => (
                  <AppStaggerItem key={s.id}>
                    <motion.div layout className={cn('space-y-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md', s.is_overdue && 'border-danger/40')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <Link href={`/production/orders/${s.production_order_id}`} className="truncate text-xs text-brand hover:underline">
                            {s.order_number} · {s.product_name}
                          </Link>
                        </div>
                        <StepStatusPill status={s.status} />
                      </div>
                      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {s.assigned_to_name && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{s.assigned_to_name}</span>}
                        {s.duration_hours !== null && <span>Est. {Number(s.duration_hours)} h</span>}
                        {s.status === 'IN_PROGRESS' && s.start_time && <span className={cn(s.is_overdue && 'font-medium text-danger')}>Started {timeAgo(s.start_time)}</span>}
                        {lane.key === 'done' && s.end_time && <span>{timeAgo(s.end_time)}</span>}
                      </p>
                      {lane.key !== 'done' && (
                        <div className="flex justify-end gap-1.5 border-t pt-2">
                          {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => act(s, 'skip')}><SkipForward className="mr-1 h-3 w-3" />Skip</Button>
                              {s.status === 'PENDING' ? (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => act(s, 'start')}><Play className="mr-1 h-3 w-3" />Start</Button>
                              ) : (
                                <Button size="sm" className="h-7 bg-brand px-2 text-xs text-brand-foreground hover:bg-brand/90" onClick={() => act(s, 'complete')}><CheckCircle2 className="mr-1 h-3 w-3" />Done</Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AppStaggerItem>
                ))}
              </AppStagger>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}
