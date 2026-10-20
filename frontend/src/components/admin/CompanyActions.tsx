// src/components/admin/CompanyActions.tsx
// Suspend / activate / extend trial / delete, each with a reason that goes into the audit log.
'use client'

import { useState } from 'react'
import { CalendarPlus, Loader2, MoreHorizontal, Play, Pause, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminService, type CompanyAction } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const COPY: Record<CompanyAction, { title: string; button: string; danger?: boolean }> = {
  SUSPEND: { title: 'Suspend company', button: 'Suspend', danger: true },
  ACTIVATE: { title: 'Reactivate company', button: 'Reactivate' },
  EXTEND_TRIAL: { title: 'Extend free trial', button: 'Extend trial' },
  DELETE: { title: 'Delete company', button: 'Delete for good', danger: true },
}

export function CompanyActions({ company, onDone, variant = 'menu' }: {
  company: { company_id: string; company_name: string; is_active: boolean }
  onDone: (action: CompanyAction) => void
  variant?: 'menu' | 'buttons'
}) {
  const [action, setAction] = useState<CompanyAction | null>(null)
  const [reason, setReason] = useState('')
  const [days, setDays] = useState('14')
  const [confirmName, setConfirmName] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = (a: CompanyAction) => {
    setAction(a); setReason(''); setDays('14'); setConfirmName(''); setError(null); setNotify(a !== 'DELETE')
  }

  const run = async () => {
    if (!action) return
    setBusy(true)
    setError(null)
    try {
      const res = await adminService.manageCompany(company.company_id, action, reason, {
        days: Number(days), confirm_name: confirmName, notify_users: action !== 'DELETE' && notify,
      })
      toast.success(res.message)
      setAction(null)
      onDone(action)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  const items: { a: CompanyAction; icon: typeof Play; label: string; show: boolean }[] = [
    { a: 'EXTEND_TRIAL', icon: CalendarPlus, label: 'Extend trial', show: true },
    { a: 'SUSPEND', icon: Pause, label: 'Suspend', show: company.is_active },
    { a: 'ACTIVATE', icon: Play, label: 'Reactivate', show: !company.is_active },
    { a: 'DELETE', icon: Trash2, label: 'Delete', show: true },
  ]
  const ready = reason.trim().length >= 5 && (action !== 'DELETE' || confirmName === company.company_name)

  return (
    <>
      {variant === 'menu' ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${company.company_name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {items.filter((i) => i.show && i.a !== 'DELETE').map((i) => <DropdownMenuItem key={i.a} onClick={() => open(i.a)}><i.icon className="mr-2 h-4 w-4" />{i.label}</DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => open('DELETE')}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.filter((i) => i.show).map((i) => (
            <Button key={i.a} size="sm" variant="outline" onClick={() => open(i.a)} className={i.a === 'DELETE' || i.a === 'SUSPEND' ? 'text-danger hover:text-danger' : ''}><i.icon className="mr-2 h-4 w-4" />{i.label}</Button>
          ))}
        </div>
      )}

      <Dialog open={!!action} onOpenChange={(o) => !busy && !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          {action && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{COPY[action].title}: {company.company_name}</DialogTitle>
                <DialogDescription>
                  {action === 'SUSPEND' && 'Everyone in the company is signed out and can’t sign in until you reactivate it. Their data is kept.'}
                  {action === 'ACTIVATE' && 'People in the company can sign in and work again.'}
                  {action === 'EXTEND_TRIAL' && 'Adds days to the current trial, or starts a trial if the company has no plan.'}
                  {action === 'DELETE' && 'Removes the company and its users permanently. Companies with stock or order history can’t be deleted; suspend them instead.'}
                </DialogDescription>
              </DialogHeader>
              {action === 'EXTEND_TRIAL' && (
                <div className="space-y-1.5"><Label htmlFor="ca-days">Days to add</Label><Input id="ca-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} /></div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ca-reason">Reason <span className="font-normal text-muted-foreground">(kept in the audit log)</span></Label>
                <Textarea id="ca-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Requested by the owner, ticket #123" />
              </div>
              {action === 'DELETE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ca-confirm">Type <span className="font-semibold">{company.company_name}</span> to confirm</Label>
                  <Input id="ca-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
                </div>
              )}
              {action !== 'DELETE' && (
                <label className="flex items-center justify-between gap-3 text-sm"><span>Email the company’s users about this</span><Switch checked={notify} onCheckedChange={setNotify} /></label>
              )}
              {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
                <Button onClick={run} disabled={!ready || busy} className={COPY[action].danger ? 'bg-danger text-white hover:bg-danger/90' : 'bg-brand text-brand-foreground hover:bg-brand/90'}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{COPY[action].button}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
