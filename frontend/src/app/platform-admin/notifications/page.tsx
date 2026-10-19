// src/app/platform-admin/notifications/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Globe, Loader2, Megaphone, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminService, type AdminNotification, type CompanyRow } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton, type Tone } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { formatDateTime, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const TYPES = [['GENERAL', 'General'], ['FEATURE', 'New feature'], ['MAINTENANCE', 'Maintenance'], ['SECURITY', 'Security'], ['BILLING', 'Billing']] as const
const PRIORITY: Record<string, Tone> = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' }
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null)

function state(n: AdminNotification): [string, Tone] {
  const now = Date.now()
  if (!n.is_active) return ['Off', 'neutral']
  if (n.expires_at && new Date(n.expires_at).getTime() <= now) return ['Expired', 'neutral']
  if (n.scheduled_for && new Date(n.scheduled_for).getTime() > now) return [`Scheduled ${formatDateTime(n.scheduled_for)}`, 'info']
  return ['Showing now', 'success']
}

function Composer({ open, onOpenChange, onSaved, companies }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void; companies: CompanyRow[] }) {
  const empty = { title: '', message: '', notification_type: 'GENERAL', priority: 'MEDIUM', is_global: true, scheduled_for: '', expires_at: '', targets: [] as string[] }
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!open) { setF(empty); setError(null) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await adminService.createNotification({
        title: f.title.trim(), message: f.message.trim(), notification_type: f.notification_type as AdminNotification['notification_type'],
        priority: f.priority as AdminNotification['priority'], is_global: f.is_global, target_company_ids: f.is_global ? [] : f.targets,
        scheduled_for: fromLocal(f.scheduled_for), expires_at: fromLocal(f.expires_at), is_active: true,
      })
      toast.success(f.scheduled_for ? 'Notification scheduled' : 'Notification is showing to users')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the notification.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>New notification</DialogTitle><DialogDescription>Shows in the bell for everyone in the chosen companies.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="n-title">Title</Label><Input id="n-title" maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Scheduled maintenance on Sunday" /></div>
          <div className="space-y-1.5"><Label htmlFor="n-msg">Message</Label><Textarea id="n-msg" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="n-type">Type</Label>
              <Select value={f.notification_type} onValueChange={(v) => setF({ ...f, notification_type: v })}><SelectTrigger id="n-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="n-pri">Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}><SelectTrigger id="n-pri" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(PRIORITY).map((k) => <SelectItem key={k} value={k}>{k.charAt(0) + k.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Globe className="h-4 w-4 text-brand" />Send to every company</span><Switch checked={f.is_global} onCheckedChange={(v) => setF({ ...f, is_global: v })} /></label>
          {!f.is_global && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {companies.map((c) => (
                <label key={c.company_id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <input type="checkbox" checked={f.targets.includes(c.company_id)} onChange={(e) => setF({ ...f, targets: e.target.checked ? [...f.targets, c.company_id] : f.targets.filter((t) => t !== c.company_id) })} />
                  {c.company_name}
                </label>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="n-start">Start showing <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="n-start" type="datetime-local" value={f.scheduled_for} onChange={(e) => setF({ ...f, scheduled_for: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="n-end">Stop showing <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="n-end" type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
          </div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button onClick={save} disabled={busy || !f.title.trim() || !f.message.trim() || (!f.is_global && !f.targets.length)} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{f.scheduled_for ? 'Schedule' : 'Publish now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<AdminNotification[] | null>(null)
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminNotification | null>(null)

  const load = useCallback(() => adminService.notifications().then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load notifications.')), [])
  useEffect(() => {
    load()
    adminService.companies().then(setCompanies).catch(() => {})
  }, [load])

  const act = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id)
    try { await fn(); toast.success(done); await load() } catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') } finally { setBusy(null); setToDelete(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Megaphone} title="Notifications" description="Announcements in users’ notification bell: maintenance, new features, billing notices."
        actions={<Button onClick={() => setComposing(true)} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New notification</Button>} />
      {error && <ErrorBanner title="Couldn’t load notifications" message={error} onRetry={load} />}
      {!rows ? <TableSkeleton rows={3} cols={3} /> : rows.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" description="Publish one to let every company know about maintenance or new features." />
      ) : (
        <AppStagger className="space-y-3">
          {rows.map((n) => {
            const [label, tone] = state(n)
            return (
              <AppStaggerItem key={n.id}>
                <div className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start', !n.is_active && 'opacity-70')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Bell className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{n.title}</p><StatusPill tone={tone} pulse={label === 'Showing now'}>{label}</StatusPill><StatusPill tone={PRIORITY[n.priority]}>{n.priority.toLowerCase()}</StatusPill></div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">{n.is_global ? 'Every company' : n.target_company_names.join(', ')} · by {n.created_by_email} · {timeAgo(n.created_at)}{n.expires_at ? ` · until ${formatDateTime(n.expires_at)}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(!n.is_active || (n.scheduled_for && new Date(n.scheduled_for) > new Date())) && <Button size="sm" variant="outline" disabled={busy === n.id} onClick={() => act(n.id, () => adminService.publishNotification(n.id), 'Showing now')}><Send className="mr-1 h-3.5 w-3.5" />Publish now</Button>}
                    {n.is_active && <Switch checked aria-label="Turn off" disabled={busy === n.id} onCheckedChange={() => act(n.id, () => adminService.updateNotification(n.id, { is_active: false }), 'Turned off')} />}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={() => setToDelete(n)} aria-label={`Delete ${n.title}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AppStaggerItem>
            )
          })}
        </AppStagger>
      )}
      <Composer open={composing} onOpenChange={setComposing} onSaved={load} companies={companies} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this notification?" description="It disappears from everyone’s bell." confirmText="Delete" variant="destructive" loading={!!busy}
        onConfirm={async () => { if (toDelete) await act(toDelete.id, () => adminService.deleteNotification(toDelete.id), 'Deleted') }} />
    </div>
  )
}
