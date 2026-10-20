// src/app/platform-admin/settings/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminService, type PlatformSetting } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { timeAgo } from '@/lib/format'

export default function PlatformSettingsPage() {
  const [rows, setRows] = useState<PlatformSetting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<PlatformSetting> | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<PlatformSetting | null>(null)

  const load = useCallback(() => adminService.settings().then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load settings.')), [])
  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await adminService.saveSetting({ setting_key: editing.setting_key?.trim(), setting_value: editing.setting_value ?? '', description: editing.description ?? '', is_active: editing.is_active ?? true }, editing.id)
      toast.success('Setting saved')
      setEditing(null)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Couldn’t save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Platform settings" description="Key–value settings used across LogiFlow. Every change is recorded in the audit log."
        actions={<Button onClick={() => { setEditing({ is_active: true }); setFormError(null) }} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Add setting</Button>} />
      {error && <ErrorBanner title="Couldn’t load settings" message={error} onRetry={load} />}
      {!rows ? <TableSkeleton rows={4} cols={3} /> : rows.length === 0 ? <EmptyState icon={<Settings />} title="No settings yet" description="Add one when the platform needs a configurable value." /> : (
        <FadeIn className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Key</th><th className="px-3 py-3 font-medium">Value</th><th className="px-3 py-3 font-medium">Changed</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y">
                {rows.map((s, i) => (
                  <MotionRow key={s.id} index={i} className="align-top">
                    <td className="px-5 py-3"><p className="font-mono text-xs font-medium">{s.setting_key}</p>{s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}{!s.is_active && <StatusPill tone="neutral" className="mt-1">off</StatusPill>}</td>
                    <td className="max-w-xs px-3 py-3"><code className="line-clamp-3 break-all rounded bg-muted px-1.5 py-0.5 text-xs">{s.setting_value}</code></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{timeAgo(s.updated_at)}{s.modified_by_email && <span className="block">{s.modified_by_email}</span>}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(s); setFormError(null) }} aria-label={`Edit ${s.setting_key}`}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={() => setToDelete(s)} aria-label={`Delete ${s.setting_key}`}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !saving && !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit setting' : 'Add setting'}</DialogTitle><DialogDescription>Values are stored as text.</DialogDescription></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="ps-key">Key</Label><Input id="ps-key" className="font-mono" value={editing.setting_key ?? ''} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, setting_key: e.target.value })} placeholder="maintenance_banner" /></div>
              <div className="space-y-1.5"><Label htmlFor="ps-val">Value</Label><Textarea id="ps-val" rows={3} className="font-mono text-xs" value={editing.setting_value ?? ''} onChange={(e) => setEditing({ ...editing, setting_value: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ps-desc">Description</Label><Input id="ps-desc" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <label className="flex items-center justify-between text-sm">Active<Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></label>
              {formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
              <Button onClick={save} disabled={saving || !editing.setting_key?.trim()} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this setting?" description={`“${toDelete?.setting_key}” will be removed.`} confirmText="Delete" variant="destructive"
        onConfirm={async () => { if (toDelete) { try { await adminService.deleteSetting(toDelete.id); toast.success('Deleted'); load() } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete.') } finally { setToDelete(null) } } }} />
    </div>
  )
}
