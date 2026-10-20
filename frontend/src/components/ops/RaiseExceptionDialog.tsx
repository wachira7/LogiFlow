// src/components/ops/RaiseExceptionDialog.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { opsService, type ExceptionType, type OpsException, type Severity } from '@/services/opsService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { EXCEPTION_TYPES, SEVERITY } from './status'

export function RaiseExceptionDialog({ open, onOpenChange, shipment, routeId, onRaised }: {
  open: boolean; onOpenChange: (v: boolean) => void; shipment?: { id: string; number: string } | null; routeId?: string
  onRaised?: (e: OpsException) => void
}) {
  const [type, setType] = useState<ExceptionType>('DELAY')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) { setType('DELAY'); setSeverity('MEDIUM'); setTitle(''); setDescription(''); setError(null) } }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const label = EXCEPTION_TYPES.find(([k]) => k === type)?.[1] ?? 'Problem'
    setBusy(true); setError(null)
    try {
      const created = await opsService.createException({
        exception_type: type, severity, title: title.trim() || `${label}${shipment ? ` on ${shipment.number}` : ''}`, description,
        shipment_id: shipment?.id ?? null, route_id: routeId ?? null,
      })
      toast.success('Exception raised. It’s on the ops board.')
      onRaised?.(created); onOpenChange(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t raise it.') } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise an exception</DialogTitle>
          <DialogDescription>Flag a problem{shipment ? ` with ${shipment.number}` : ''} so someone owns it until it’s resolved.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5"><Label htmlFor="ex-type">What happened</Label>
            <Select value={type} onValueChange={(v) => setType(v as ExceptionType)}>
              <SelectTrigger id="ex-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{EXCEPTION_TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>How serious</Label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 text-sm" role="radiogroup" aria-label="Severity">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={severity === s} onClick={() => setSeverity(s)}
                  className={cn('rounded-md px-2 py-1.5 font-medium transition-colors', severity === s ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    severity === s && s === 'CRITICAL' && 'text-danger', severity === s && s === 'HIGH' && 'text-warning')}>{SEVERITY[s].label}</button>
              ))}
            </div></div>
          <div className="space-y-1.5"><Label htmlFor="ex-title">Summary <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="ex-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Truck stuck at Mlolongo weighbridge" /></div>
          <div className="space-y-1.5"><Label htmlFor="ex-desc">Details</Label>
            <Textarea id="ex-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you know, who you’ve spoken to…" /></div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Raise exception</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
