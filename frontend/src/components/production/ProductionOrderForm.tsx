// src/components/production/ProductionOrderForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Factory, Layers, ListChecks, Loader2, Lock, Plus, Trash2 } from 'lucide-react'
import { useProductionOrders } from '@/hooks/useProduction'
import { useWarehouses } from '@/hooks/useInventory'
import { inventoryService } from '@/services/inventoryService'
import { AuthService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import { formatCount, formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/inventory.types'
import type { CreateProductionOrderData, ProductionOrderStatus, UpdateProductionOrderData } from '@/types/production.types'

interface Props {
  orderId?: string
  isEdit?: boolean
}

type StepRow = { key: string; name: string; hours: string; assignee: string }
type MaterialRow = { key: string; product: string; warehouse: string; qty: string }
type Member = { id: string; first_name?: string; last_name?: string; email: string }

const key = () => crypto.randomUUID()
const memberName = (m: Member) => `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email

// Fields each status allows (mirrors the API)
const EDITABLE: Record<ProductionOrderStatus, string[]> = {
  PLANNED: ['order_number', 'product', 'quantity', 'start_date', 'end_date', 'notes', 'output_warehouse'],
  IN_PROGRESS: ['end_date', 'notes', 'output_warehouse'],
  COMPLETED: ['notes'],
  CANCELLED: ['notes'],
}

// <input type="datetime-local"> works in local time without a zone
const toLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-danger">{message}</p> : null
}

export function ProductionOrderForm({ orderId, isEdit = false }: Props) {
  const router = useRouter()
  const { createOrder, updateOrder, fetchOrderById, currentOrder } = useProductionOrders()
  const { warehouses = [], isLoading: warehousesLoading } = useWarehouses()

  const [products, setProducts] = useState<Product[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingOrder, setLoadingOrder] = useState(isEdit)
  // product → warehouse → quantity on hand
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({})

  const [form, setForm] = useState({ order_number: '', product: '', quantity: '1', output_warehouse: '', start_date: '', end_date: '', notes: '' })
  const [steps, setSteps] = useState<StepRow[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      inventoryService.getProducts({ is_active: true }, 1, 100).then((res) => setProducts(res.data ?? [])),
      AuthService.getCompanyUsers().then((res) => {
        const d = res.data as unknown
        setMembers((Array.isArray(d) ? d : (d as { results?: Member[] })?.results ?? []) as Member[])
      }),
      inventoryService.getInventoryItems({}, 1, 100).then((res) => {
        const map: Record<string, Record<string, number>> = {}
        for (const line of res.data ?? []) if (line.warehouse_id) (map[line.product_id] ??= {})[line.warehouse_id] = line.quantity
        setStock(map)
      }),
    ]).finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    if (isEdit && orderId) fetchOrderById(orderId).catch(() => {}).finally(() => setLoadingOrder(false))
  }, [isEdit, orderId, fetchOrderById])

  useEffect(() => {
    if (!isEdit || !currentOrder) return
    setForm({
      order_number: currentOrder.order_number,
      product: currentOrder.product_id,
      quantity: String(currentOrder.quantity),
      output_warehouse: currentOrder.output_warehouse_id ?? '',
      start_date: toLocalInput(currentOrder.start_date),
      end_date: toLocalInput(currentOrder.end_date),
      notes: currentOrder.notes ?? '',
    })
  }, [isEdit, currentOrder])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const status: ProductionOrderStatus = isEdit && currentOrder ? currentOrder.status : 'PLANNED'
  const can = (field: string) => EDITABLE[status].includes(field)
  const product = productById.get(form.product)
  const materialCost = materials.reduce((sum, m) => sum + (Number(m.qty) || 0) * toNumber(productById.get(m.product)?.cost_price), 0)
  const plannedHours = steps.reduce((sum, s) => sum + (Number(s.hours) || 0), 0)

  const set = (field: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [field]: v }))
    setErrors((e) => ({ ...e, [field]: '', submit: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.product) next.product = 'Choose what you’re making'
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) next.quantity = 'Enter a whole number, at least 1'
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) next.end_date = 'The target end must be after the start'
    if (!isEdit) {
      steps.forEach((s, i) => { if (!s.name.trim()) next[`step_${i}`] = 'Name this step or remove it' })
      materials.forEach((m, i) => {
        if (!m.product || !m.warehouse) next[`material_${i}`] = 'Choose a material and warehouse'
        else if (!(Number(m.qty) >= 1)) next[`material_${i}`] = 'Quantity must be at least 1'
        else if (m.product === form.product) next[`material_${i}`] = 'An order can’t use the product it makes'
      })
      const pairs = materials.filter((m) => m.product && m.warehouse).map((m) => `${m.product}:${m.warehouse}`)
      if (new Set(pairs).size !== pairs.length) next.materials = 'Each material can be listed once per warehouse; combine the quantities'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEdit && orderId) {
        const data: UpdateProductionOrderData = {}
        if (can('order_number')) data.order_number = form.order_number.trim()
        if (can('product')) data.product_id = form.product
        if (can('quantity')) data.quantity = Number(form.quantity)
        if (can('start_date')) data.start_date = fromLocalInput(form.start_date)
        if (can('end_date')) data.end_date = fromLocalInput(form.end_date)
        if (can('output_warehouse')) data.output_warehouse_id = form.output_warehouse || null
        data.notes = form.notes
        await updateOrder(orderId, data)
        router.push(`/production/orders/${orderId}`)
      } else {
        const data: CreateProductionOrderData = {
          order_number: form.order_number.trim() || undefined,
          product_id: form.product,
          quantity: Number(form.quantity),
          output_warehouse_id: form.output_warehouse || null,
          start_date: fromLocalInput(form.start_date),
          end_date: fromLocalInput(form.end_date),
          notes: form.notes,
          production_steps: steps.map((s) => ({ name: s.name.trim(), duration_hours: s.hours || null, assigned_to_id: s.assignee || null })),
          production_materials: materials.map((m) => ({ product_id: m.product, warehouse_id: m.warehouse, quantity: Number(m.qty) })),
        }
        const created = await createOrder(data)
        router.push(created?.id ? `/production/orders/${created.id}` : '/production/orders')
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error && err.message ? err.message : 'Couldn’t save the order. Please try again.' })
      setSubmitting(false)
    }
  }

  const back = isEdit && orderId ? { href: `/production/orders/${orderId}`, label: 'Back to order' } : { href: '/production/orders', label: 'Production orders' }

  if (warehousesLoading || loadingData || loadingOrder) {
    return (
      <div className="space-y-6" aria-busy aria-label="Loading form">
        <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-72" /></div>
        <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-[28rem] rounded-xl lg:col-span-2" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
    )
  }

  const LockedHint = ({ field }: { field: string }) =>
    isEdit && !can(field) ? <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" aria-label="Locked" /> : null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        back={back}
        title={isEdit ? `Edit ${form.order_number || 'order'}` : 'New production order'}
        description={isEdit ? 'Steps and materials are managed on the order page.' : 'Raw materials leave stock when production starts; finished goods are stocked when it completes.'}
      />

      {isEdit && status !== 'PLANNED' && (
        <FadeIn>
          <div className="flex items-start gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              {status === 'IN_PROGRESS'
                ? 'Production has started, so the product, quantity and start are locked (materials have left stock). You can still change the target end, output warehouse and notes.'
                : 'This order is finished; only the notes can change.'}
            </p>
          </div>
        </FadeIn>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={Factory} title="What you’re making" delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="space-y-1.5 sm:col-span-4">
                <Label htmlFor="product">Product <LockedHint field="product" /></Label>
                <Select value={form.product} onValueChange={(v) => set('product', v)} disabled={!can('product')}>
                  <SelectTrigger id="product" className={cn('w-full', errors.product && 'border-danger')}><SelectValue placeholder="Choose a product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError message={errors.product} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="quantity">Quantity{product?.unit_of_measure ? ` (${product.unit_of_measure})` : ''} <LockedHint field="quantity" /></Label>
                <Input id="quantity" type="number" min={1} inputMode="numeric" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} disabled={!can('quantity')} className={cn(errors.quantity && 'border-danger')} />
                <FieldError message={errors.quantity} />
              </div>
              <div className="space-y-1.5 sm:col-span-6">
                <Label htmlFor="output">Stock finished goods in <LockedHint field="output_warehouse" /></Label>
                <Select value={form.output_warehouse || 'none'} onValueChange={(v) => set('output_warehouse', v === 'none' ? '' : v)} disabled={!can('output_warehouse')}>
                  <SelectTrigger id="output" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Decide later</SelectItem>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Needed before the order can be completed.</p>
              </div>
            </div>
          </Panel>

          {!isEdit && (
            <Panel icon={ListChecks} title="Steps" description={plannedHours ? `About ${plannedHours} hours of work in total` : 'The stages this run goes through, in order'} delay={0.1}
              action={<Button type="button" size="sm" variant="outline" onClick={() => setSteps((s) => [...s, { key: key(), name: '', hours: '', assignee: '' }])}><Plus className="mr-1.5 h-4 w-4" />Add step</Button>}>
              {steps.length === 0 ? (
                <button type="button" onClick={() => setSteps([{ key: key(), name: '', hours: '', assignee: '' }])} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand">
                  <Plus className="h-5 w-5" />Add the first step (optional)
                </button>
              ) : (
                <ol className="space-y-3">
                  <AnimatePresence initial={false}>
                    {steps.map((s, i) => (
                      <motion.li key={s.key} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }} className="flex gap-3 rounded-xl border bg-muted/20 p-3">
                        <span className="mt-6 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
                        <div className="grid flex-1 gap-3 sm:grid-cols-12">
                          <div className="space-y-1.5 sm:col-span-5">
                            <Label htmlFor={`step-${s.key}`} className="text-xs">Step</Label>
                            <Input id={`step-${s.key}`} value={s.name} placeholder="e.g. Mixing" className={cn('bg-card', errors[`step_${i}`] && 'border-danger')}
                              onChange={(e) => setSteps((rows) => rows.map((r) => (r.key === s.key ? { ...r, name: e.target.value } : r)))} />
                            <FieldError message={errors[`step_${i}`]} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor={`hours-${s.key}`} className="text-xs">Est. hours</Label>
                            <Input id={`hours-${s.key}`} type="number" min={0} step="0.25" value={s.hours} className="bg-card"
                              onChange={(e) => setSteps((rows) => rows.map((r) => (r.key === s.key ? { ...r, hours: e.target.value } : r)))} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-5">
                            <Label htmlFor={`who-${s.key}`} className="text-xs">Assigned to</Label>
                            <Select value={s.assignee || 'none'} onValueChange={(v) => setSteps((rows) => rows.map((r) => (r.key === s.key ? { ...r, assignee: v === 'none' ? '' : v } : r)))}>
                              <SelectTrigger id={`who-${s.key}`} className="w-full bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nobody yet</SelectItem>
                                {members.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="mt-5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove step"
                          onClick={() => setSteps((rows) => rows.filter((r) => r.key !== s.key))}><Trash2 className="h-4 w-4" /></Button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </Panel>
          )}

          {!isEdit && (
            <Panel icon={Layers} title="Raw materials" description="Stock shown is what each warehouse holds now" delay={0.15}
              action={<Button type="button" size="sm" variant="outline" onClick={() => setMaterials((m) => [...m, { key: key(), product: '', warehouse: warehouses[0]?.id ?? '', qty: '1' }])}><Plus className="mr-1.5 h-4 w-4" />Add material</Button>}>
              {errors.materials && (
                <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"><AlertTriangle className="h-4 w-4 shrink-0" />{errors.materials}</p>
              )}
              {materials.length === 0 ? (
                <button type="button" onClick={() => setMaterials([{ key: key(), product: '', warehouse: warehouses[0]?.id ?? '', qty: '1' }])} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand">
                  <Plus className="h-5 w-5" />Add the first material (optional)
                </button>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {materials.map((m, i) => {
                      const have = m.product && m.warehouse ? stock[m.product]?.[m.warehouse] ?? 0 : null
                      const shortBy = have !== null ? (Number(m.qty) || 0) - have : 0
                      return (
                        <motion.li key={m.key} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }} className="rounded-xl border bg-muted/20 p-3">
                          <div className="grid gap-3 sm:grid-cols-12">
                            <div className="space-y-1.5 sm:col-span-5">
                              <Label htmlFor={`mat-${m.key}`} className="text-xs">Material</Label>
                              <Select value={m.product} onValueChange={(v) => setMaterials((rows) => rows.map((r) => (r.key === m.key ? { ...r, product: v } : r)))}>
                                <SelectTrigger id={`mat-${m.key}`} className={cn('w-full bg-card', errors[`material_${i}`] && 'border-danger')}><SelectValue placeholder="Choose a product" /></SelectTrigger>
                                <SelectContent>{products.filter((p) => p.id !== form.product).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5 sm:col-span-4">
                              <Label htmlFor={`wh-${m.key}`} className="text-xs">From warehouse</Label>
                              <Select value={m.warehouse} onValueChange={(v) => setMaterials((rows) => rows.map((r) => (r.key === m.key ? { ...r, warehouse: v } : r)))}>
                                <SelectTrigger id={`wh-${m.key}`} className="w-full bg-card"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label htmlFor={`q-${m.key}`} className="text-xs">Qty</Label>
                              <Input id={`q-${m.key}`} type="number" min={1} value={m.qty} className={cn('bg-card', shortBy > 0 && 'border-danger')}
                                onChange={(e) => setMaterials((rows) => rows.map((r) => (r.key === m.key ? { ...r, qty: e.target.value } : r)))} />
                            </div>
                            <div className="flex items-end justify-end sm:col-span-1">
                              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove material"
                                onClick={() => setMaterials((rows) => rows.filter((r) => r.key !== m.key))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          {errors[`material_${i}`] ? <p className="mt-2"><FieldError message={errors[`material_${i}`]} /></p> : have !== null && (
                            <p className={cn('mt-2 text-xs', shortBy > 0 ? 'font-medium text-danger' : 'text-muted-foreground')}>
                              {formatCount(have)} in stock{shortBy > 0 ? ` · ${formatCount(shortBy)} short (you can still plan it; it can’t start until restocked)` : ''}
                            </p>
                          )}
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Schedule & details" delay={0.2}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="start">Planned start <LockedHint field="start_date" /></Label>
                <Input id="start" type="datetime-local" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} disabled={!can('start_date')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">Target end <LockedHint field="end_date" /></Label>
                <Input id="end" type="datetime-local" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} disabled={!can('end_date')} className={cn(errors.end_date && 'border-danger')} />
                <FieldError message={errors.end_date} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="number">Order number <span className="font-normal text-muted-foreground">(optional)</span> <LockedHint field="order_number" /></Label>
                <Input id="number" value={form.order_number} onChange={(e) => set('order_number', e.target.value)} placeholder={isEdit ? '' : 'Numbered automatically'} disabled={!can('order_number')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Batch details, shift, customer order…" />
              </div>
            </div>
          </Panel>

          <FadeIn delay={0.25} className="sticky top-20 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Summary</p>
            <p className="text-sm">{product ? <><span className="font-medium">{formatCount(Number(form.quantity) || 0)} × {product.name}</span></> : <span className="text-muted-foreground">Choose a product</span>}</p>
            {!isEdit && (
              <dl className="grid grid-cols-3 gap-2 border-y py-3 text-center">
                <div><dt className="text-xs text-muted-foreground">Steps</dt><dd className="font-semibold tabular-nums">{steps.length}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Materials</dt><dd className="font-semibold tabular-nums">{materials.length}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Cost</dt><dd className="truncate font-semibold tabular-nums">{formatMoney(materialCost, undefined, { maximumFractionDigits: 0 })}</dd></div>
              </dl>
            )}
            {errors.submit && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <Button type="submit" disabled={submitting} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : isEdit ? 'Save changes' : 'Create order'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={submitting} onClick={() => router.push(back.href)}>Cancel</Button>
          </FadeIn>
        </div>
      </form>

      {isEdit && !currentOrder && <ErrorBanner title="Couldn’t load this order" message="It may have been deleted." />}
    </div>
  )
}
