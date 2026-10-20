// src/components/inventory/AdjustStockDialog.tsx
// Add or remove stock for one product in one warehouse; every change is recorded as an ADJUSTMENT movement.
'use client'

import { useEffect, useState } from 'react'
import { Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { stockService } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format'

const REASONS = ['Stock count', 'Goods received', 'Damaged', 'Expired', 'Lost or stolen', 'Returned by customer', 'Other']

export type AdjustTarget = { productId: string; productName: string; warehouseId: string; warehouseName: string; quantity: number; unit?: string }

export function AdjustStockDialog({ target, onClose, onDone }: { target: AdjustTarget | null; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (target) { setMode('add'); setQty(''); setReason(REASONS[0]); setNotes(''); setError(null) } }, [target])

  const current = target?.quantity ?? 0
  const n = Math.floor(Number(qty) || 0)
  const delta = mode === 'add' ? n : mode === 'remove' ? -n : n - current
  const after = current + delta

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) return
    if (qty === '' || delta === 0) return setError(mode === 'set' ? 'That’s already the quantity on hand.' : 'Enter how many units.')
    if (after < 0) return setError(`Only ${formatCount(current)} on hand, so you can remove at most that.`)
    setBusy(true); setError(null)
    try {
      const r = await stockService.adjust({ product_id: target.productId, warehouse_id: target.warehouseId, adjustment_quantity: delta, reason, notes })
      toast.success(`${target.productName}: ${formatCount(r.old_quantity)} → ${formatCount(r.new_quantity)}`)
      onDone(); onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t adjust the stock.')
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{target?.productName} in {target?.warehouseName}. The change is kept in the movement history.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm" role="radiogroup" aria-label="Adjustment type">
            {([['add', 'Add'], ['remove', 'Remove'], ['set', 'Set to']] as const).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                className={cn('rounded-md px-2 py-1.5 font-medium transition-colors', mode === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">{mode === 'set' ? 'Counted quantity' : 'Units'}</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Less" onClick={() => setQty(String(Math.max(0, n - 1)))}><Minus className="h-4 w-4" /></Button>
              <Input id="adj-qty" type="number" min={0} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="text-center text-lg tabular-nums" autoFocus />
              <Button type="button" variant="outline" size="icon" aria-label="More" onClick={() => setQty(String(n + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">On hand</span>
            <span className="tabular-nums">{formatCount(current)} <span className="text-muted-foreground">→</span>{' '}
              <span className={cn('font-semibold', after < 0 ? 'text-danger' : delta > 0 ? 'text-success' : delta < 0 ? 'text-warning' : '')}>{formatCount(after)}</span>
              {target?.unit ? <span className="text-muted-foreground"> {target.unit}</span> : null}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}><SelectTrigger id="adj-reason" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="adj-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="adj-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save adjustment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
