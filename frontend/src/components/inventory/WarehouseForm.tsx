// src/components/inventory/WarehouseForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, MapPin, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { stockService } from '@/services/stockService'
import { teamService, roleLabel, type Member } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'

const EMPTY = { name: '', code: '', description: '', address: '', city: '', state: '', postal_code: '', country: '', phone: '', email: '', capacity: '', manager_id: '', is_active: true }
type Fields = typeof EMPTY

export function WarehouseForm({ warehouseId }: { warehouseId?: string }) {
  const router = useRouter()
  const [f, setF] = useState<Fields>(EMPTY)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(!!warehouseId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | 'submit', string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teamService.members().then((m) => setMembers(m.filter((x) => x.is_active))).catch(() => {})
    if (warehouseId) stockService.warehouse(warehouseId).then((w) => setF({
      name: w.name, code: w.code ?? '', description: w.description ?? '', address: w.address ?? '', city: w.city ?? '', state: w.state ?? '',
      postal_code: w.postal_code ?? '', country: w.country ?? '', phone: w.phone ?? '', email: w.email ?? '', capacity: w.capacity ? String(w.capacity) : '',
      manager_id: w.manager_id ?? '', is_active: w.is_active,
    })).catch((err) => setLoadError(err instanceof Error ? err.message : 'Couldn’t load this warehouse.')).finally(() => setLoading(false))
  }, [warehouseId])

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!f.name.trim()) errs.name = 'Name the warehouse.'
    if (f.code.length > 20) errs.code = 'Keep the code to 20 characters.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = 'That doesn’t look like an email address.'
    if (f.capacity && (!Number.isInteger(Number(f.capacity)) || Number(f.capacity) < 0)) errs.capacity = 'Enter a whole number of units.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    const data = { ...f, name: f.name.trim(), code: f.code.trim().toUpperCase(), capacity: f.capacity ? Number(f.capacity) : null, manager_id: f.manager_id || null }
    try {
      const saved = warehouseId ? await stockService.updateWarehouse(warehouseId, data) : await stockService.createWarehouse(data)
      toast.success(warehouseId ? 'Warehouse saved' : `${saved.name} added`)
      router.push(`/inventory/warehouses/${saved.id}`)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Couldn’t save the warehouse.' })
      setSaving(false)
    }
  }

  const back = warehouseId ? { href: `/inventory/warehouses/${warehouseId}`, label: 'Back to warehouse' } : { href: '/inventory/warehouses', label: 'Warehouses' }
  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-96 rounded-xl" /></div>
  if (loadError) return <div className="space-y-6"><PageHeader icon={Building2} title="Warehouse" back={back} /><ErrorBanner message={loadError} /></div>

  const field = (k: keyof Fields, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`w-${k}`}>{label}</Label>
      <Input id={`w-${k}`} value={f[k] as string} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] ? <p className="text-xs text-danger">{errors[k]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} back={back} title={warehouseId ? `Edit ${f.name || 'warehouse'}` : 'New warehouse'} description="Anywhere you keep stock: a warehouse, a shop backroom or a depot." />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={Building2} title="Warehouse" delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('name', 'Name', { placeholder: 'Nairobi Central', autoFocus: !warehouseId })}
              {field('code', 'Code', { placeholder: 'NBO-1', className: 'font-mono uppercase' }, 'Short label for lists and labels.')}
              {field('capacity', 'Capacity (units)', { type: 'number', min: 0, inputMode: 'numeric' }, 'Optional; shows how full it is.')}
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="w-desc">Description</Label><Textarea id="w-desc" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
            </div>
          </Panel>
          <Panel icon={MapPin} title="Location" delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('address', 'Street address', { placeholder: 'Enterprise Rd, Industrial Area' })}</div>
              {field('city', 'City')}
              {field('state', 'County / state')}
              {field('postal_code', 'Postal code')}
              {field('country', 'Country')}
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel icon={UserRound} title="Contact" delay={0.1}>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="w-mgr">Manager</Label>
                <Select value={f.manager_id || 'none'} onValueChange={(v) => set('manager_id', v === 'none' ? '' : v)}>
                  <SelectTrigger id="w-mgr" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No manager</SelectItem>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email} · {roleLabel(m.role)}</SelectItem>)}</SelectContent>
                </Select></div>
              {field('phone', 'Phone', { inputMode: 'tel' })}
              {field('email', 'Email', { type: 'email' })}
            </div>
          </Panel>
          <Panel delay={0.15}>
            <label className="flex items-center justify-between gap-3 text-sm"><span><span className="font-medium">Active</span><span className="block text-xs text-muted-foreground">Inactive warehouses can’t receive new stock.</span></span>
              <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', v)} aria-label="Active" /></label>
            {errors.submit && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <div className="mt-4 flex gap-2 border-t pt-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => router.push(back.href)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="btn-shine flex-1 bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{warehouseId ? 'Save' : 'Create warehouse'}</Button>
            </div>
          </Panel>
        </div>
      </form>
    </div>
  )
}
