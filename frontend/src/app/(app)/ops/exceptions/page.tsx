// src/app/(app)/ops/exceptions/page.tsx
// Exceptions: problems that need an owner until they're resolved.
'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, Hand, Loader2, Plus, RotateCcw, Search, ShieldCheck, Siren, Truck, UserX, X } from 'lucide-react'
import { toast } from 'sonner'
import { opsService, type OpsException } from '@/services/opsService'
import { teamService, type Member } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, FilterChips, PageHeader, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { ExceptionStatusPill, SEVERITY, SeverityPill, age } from '@/components/ops/status'
import { RaiseExceptionDialog } from '@/components/ops/RaiseExceptionDialog'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useLiveRefresh } from '@/lib/realtime'
import { formatDateTime, timeAgo } from '@/lib/format'

type View = 'open' | 'mine' | 'unassigned' | 'closed' | 'all'
const VIEWS = [['open', 'Open'], ['mine', 'Mine'], ['unassigned', 'Unassigned'], ['closed', 'Closed'], ['all', 'All']] as const

function Detail({ exc, members, onChange, onClose }: { exc: OpsException | null; members: Member[]; onChange: (e: OpsException) => void; onClose: () => void }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { setNotes('') }, [exc?.id])
  if (!exc) return null
  const open = exc.status === 'OPEN' || exc.status === 'ACKNOWLEDGED'

  const run = async (key: string, fn: () => Promise<OpsException>, done: string) => {
    setBusy(key)
    try { const e = await fn(); onChange(e); toast.success(done); setNotes('') } catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-5 px-4 pb-6 sm:px-6">
      <div className="flex flex-wrap gap-1.5"><SeverityPill severity={exc.severity} /><ExceptionStatusPill status={exc.status} /><span className="text-xs text-muted-foreground self-center">{exc.type_label}</span></div>
      {exc.description && <p className="whitespace-pre-wrap text-sm">{exc.description}</p>}
      {exc.recommended_action && open && <div className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm"><span className="font-medium">Suggested: </span>{exc.recommended_action}</div>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Raised</dt><dd title={formatDateTime(exc.created_at)}>{timeAgo(exc.created_at)}{exc.reported_by_name ? ` by ${exc.reported_by_name}` : ' automatically'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">{open ? 'Open for' : 'Took'}</dt><dd>{age(exc.age_minutes)}</dd></div>
        {exc.shipment_id && <div><dt className="text-xs text-muted-foreground">Shipment</dt><dd><Link href={`/distribution/shipments/${exc.shipment_id}`} className="font-medium text-brand hover:underline">{exc.shipment_number}</Link></dd></div>}
        {exc.route_id && <div><dt className="text-xs text-muted-foreground">Route</dt><dd><Link href={`/distribution/routes/${exc.route_id}`} className="font-medium text-brand hover:underline">{exc.route_name}</Link></dd></div>}
      </dl>
      <div className="space-y-1.5">
        <Label htmlFor="ex-owner">Owner</Label>
        <Select value={exc.owner_id ?? 'none'} disabled={!!busy}
          onValueChange={(v) => run('owner', () => opsService.updateException(exc.id, { owner_id: v === 'none' ? null : v }), v === 'none' ? 'Owner removed' : 'Owner assigned')}>
          <SelectTrigger id="ex-owner" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}{m.is_you ? ' (you)' : ''}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {open ? (
        <div className="space-y-3 border-t pt-4">
          {exc.status === 'OPEN' && (
            <Button variant="outline" className="w-full" disabled={!!busy} onClick={() => run('ack', () => opsService.exceptionAction(exc.id, 'acknowledge'), 'You’re on it')}>
              {busy === 'ack' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hand className="mr-2 h-4 w-4" />}I’m on it
            </Button>
          )}
          <div className="space-y-1.5"><Label htmlFor="ex-notes">How was it resolved?</Label>
            <Textarea id="ex-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Rebooked for tomorrow 10am, customer informed" /></div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={!!busy} onClick={() => run('dismiss', () => opsService.exceptionAction(exc.id, 'dismiss', notes), 'Dismissed')}>Dismiss</Button>
            <Button disabled={!!busy || !notes.trim()} onClick={() => run('resolve', () => opsService.exceptionAction(exc.id, 'resolve', notes), 'Resolved')} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {busy === 'resolve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Resolve</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 border-t pt-4 text-sm">
          <p><span className="text-muted-foreground">{exc.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'} {timeAgo(exc.resolved_at)}{exc.resolved_by_name ? ` by ${exc.resolved_by_name}` : ''}.</span></p>
          {exc.resolution_notes && <p className="rounded-lg bg-muted/50 px-3 py-2">{exc.resolution_notes}</p>}
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('reopen', () => opsService.exceptionAction(exc.id, 'reopen'), 'Reopened')}><RotateCcw className="mr-2 h-3.5 w-3.5" />Reopen</Button>
        </div>
      )}
      <Button variant="ghost" className="w-full sm:hidden" onClick={onClose}>Close</Button>
    </div>
  )
}

function ExceptionsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { user } = useAuth()
  const [view, setView] = useState<View>('open')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<OpsException[] | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof opsService.exceptionSummary>> | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [raise, setRaise] = useState(false)
  const openId = params.get('open')

  const load = useCallback(() => {
    const f: Record<string, string | undefined> = { search: query.trim() || undefined, ordering: '-created_at' }
    if (view === 'open') f.open = 'true'
    if (view === 'mine') { f.open = 'true'; f.mine = 'true' }
    if (view === 'unassigned') f.open = 'true'
    opsService.exceptions(f).then((r) => setRows(view === 'unassigned' ? r.filter((e) => !e.owner_id) : view === 'closed' ? r.filter((e) => e.status === 'RESOLVED' || e.status === 'DISMISSED') : r))
      .catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load exceptions.'))
    opsService.exceptionSummary().then(setSummary).catch(() => {})
  }, [view, query])
  useEffect(() => { const t = setTimeout(load, query ? 300 : 0); return () => clearTimeout(t) }, [load, query])
  useLiveRefresh('exception.updated', load)
  useEffect(() => { teamService.members().then((m) => setMembers(m.filter((x) => x.is_active))).catch(() => {}) }, [])

  // Open items first by severity, then oldest first so nothing waits forever
  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => {
    const ao = a.status === 'OPEN' || a.status === 'ACKNOWLEDGED', bo = b.status === 'OPEN' || b.status === 'ACKNOWLEDGED'
    if (ao !== bo) return ao ? -1 : 1
    if (ao) return SEVERITY[a.severity].rank - SEVERITY[b.severity].rank || b.age_minutes - a.age_minutes
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }), [rows])
  const [selected, setSelected] = useState<OpsException | null>(null)
  useEffect(() => {
    if (!openId) { setSelected(null); return }
    const hit = rows?.find((e) => e.id === openId)
    if (hit) setSelected(hit)
    else opsService.exceptions().then((all) => setSelected(all.find((e) => e.id === openId) ?? null)).catch(() => {})
  }, [openId, rows])
  const select = (id: string | null) => router.replace(id ? `${pathname}?open=${id}` : pathname, { scroll: false })
  const changed = (e: OpsException) => { setSelected(e); setRows((r) => r?.map((x) => (x.id === e.id ? e : x)) ?? r); opsService.exceptionSummary().then(setSummary).catch(() => {}) }

  const sev = summary?.by_severity ?? {}
  return (
    <div className="space-y-6">
      <PageHeader icon={Siren} title="Exceptions" description="Late, failed or damaged deliveries. Each one needs an owner until it’s resolved."
        actions={<Button onClick={() => setRaise(true)} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Raise exception</Button>} />

      {!summary ? <StatGridSkeleton count={4} /> : (
        <StatGrid>
          <StatCard label="Open" value={summary.open} icon={AlertTriangle} tone={summary.open ? 'warning' : 'success'} hint={`${(sev.CRITICAL ?? 0) + (sev.HIGH ?? 0)} high or critical`} />
          <StatCard label="Unassigned" value={summary.unassigned} icon={UserX} tone={summary.unassigned ? 'danger' : 'neutral'} hint="Nobody owns these yet" />
          <StatCard label="Resolved this week" value={summary.resolved_7d} icon={CheckCircle2} tone="success" />
          <StatCard label="Typical fix time" value={summary.median_minutes_to_resolve ?? 0} icon={Clock} tone="info" format={(n) => (summary.median_minutes_to_resolve == null ? '—' : age(Math.round(n)))} hint="Median, last 7 days" />
        </StatGrid>
      )}

      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips id="exceptions" options={VIEWS} value={view} onChange={setView} />
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or shipment…" className="bg-card pl-9 pr-9" aria-label="Search exceptions" />
          {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </FadeIn>

      {error && <ErrorBanner title="Couldn’t load exceptions" message={error} onRetry={load} />}
      {!rows ? <TableSkeleton rows={5} cols={4} /> : sorted.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={view === 'open' || view === 'mine' || view === 'unassigned' ? 'All clear' : 'No exceptions here'}
          description={view === 'mine' ? 'Nothing assigned to you.' : 'Late shipments and failed stops raise exceptions automatically; you can also raise one by hand.'} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {sorted.map((e) => (
              <li key={e.id}><button onClick={() => select(e.id)} className="w-full space-y-1.5 px-4 py-3 text-left active:bg-muted/60">
                <div className="flex items-start justify-between gap-2"><p className="font-medium">{e.title}</p><SeverityPill severity={e.severity} /></div>
                <p className="text-xs text-muted-foreground">{e.type_label} · {age(e.age_minutes)} · {e.owner_name ?? 'unassigned'}</p>
              </button></li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Exception</th><th className="px-3 py-3 font-medium">Severity</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">About</th><th className="px-3 py-3 font-medium">Owner</th><th className="px-5 py-3 text-right font-medium">Age</th></tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((e, i) => (
                  <MotionRow key={e.id} index={i} onClick={() => select(e.id)} className={cn('cursor-pointer transition-colors hover:bg-muted/40', e.id === openId && 'bg-brand-soft/40')}>
                    <td className="max-w-80 px-5 py-3"><p className="truncate font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.type_label}</p></td>
                    <td className="px-3 py-3"><SeverityPill severity={e.severity} /></td>
                    <td className="px-3 py-3"><ExceptionStatusPill status={e.status} /></td>
                    <td className="px-3 py-3 text-muted-foreground">{e.shipment_number ? <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{e.shipment_number}</span> : e.route_name ?? '—'}</td>
                    <td className="px-3 py-3">{e.owner_name ?? <span className="text-danger">Unassigned</span>}{e.owner_id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td>
                    <td className={cn('px-5 py-3 text-right tabular-nums', (e.status === 'OPEN' && e.age_minutes > 120) ? 'font-medium text-danger' : 'text-muted-foreground')}>{age(e.age_minutes)}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => !v && select(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="px-4 sm:px-6"><SheetTitle className="pr-6">{selected?.title}</SheetTitle><SheetDescription>{selected?.shipment_number ?? selected?.route_name ?? 'General'}</SheetDescription></SheetHeader>
          <Detail exc={selected} members={members} onChange={changed} onClose={() => select(null)} />
        </SheetContent>
      </Sheet>
      <RaiseExceptionDialog open={raise} onOpenChange={setRaise} onRaised={(e) => { load(); select(e.id) }} />
    </div>
  )
}

export default function ExceptionsPage() {
  return <Suspense fallback={<TableSkeleton rows={5} cols={4} />}><ExceptionsContent /></Suspense>
}
