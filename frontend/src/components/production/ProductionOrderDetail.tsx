// src/components/production/ProductionOrderDetail.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Ban, Boxes, CheckCircle2, ClipboardList, Edit, Factory, Layers, ListChecks, Loader2, Play, Plus,
  SkipForward, Trash2, User, Warehouse, XCircle,
} from 'lucide-react'
import { useProductionOrders } from '@/hooks/useProduction'
import { useWarehouses } from '@/hooks/useInventory'
import productionService from '@/services/productionService'
import { inventoryService } from '@/services/inventoryService'
import { AuthService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import { formatCount, formatDateTime, formatDay, formatMoney, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OrderStatusPill, ProgressRing, StepStatusPill } from './status'
import type { Product } from '@/types/inventory.types'
import type { ProductionStep } from '@/types/production.types'

type OrderAction = 'start' | 'complete' | 'cancel' | 'delete'
type Member = { id: string; first_name?: string; last_name?: string; email: string }

const hoursLabel = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} h`)
const memberName = (m: Member) => `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading order">
      <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-44" /></div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-5"><Skeleton className="h-80 rounded-xl lg:col-span-3" /><Skeleton className="h-80 rounded-xl lg:col-span-2" /></div>
    </div>
  )
}

export function ProductionOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter()
  const { currentOrder: order, error, fetchOrderById, startProduction, completeProduction, cancelProduction, deleteOrder } = useProductionOrders()
  const { warehouses = [] } = useWarehouses()

  const [initialLoad, setInitialLoad] = useState(true)
  const [pending, setPending] = useState<OrderAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyStep, setBusyStep] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Inline "add step" and "add material" forms
  const [stepForm, setStepForm] = useState<{ name: string; hours: string; assignee: string } | null>(null)
  const [materialForm, setMaterialForm] = useState<{ product: string; warehouse: string; qty: string } | null>(null)

  const refresh = () => fetchOrderById(orderId).catch(() => {})

  useEffect(() => {
    fetchOrderById(orderId).catch(() => {}).finally(() => setInitialLoad(false))
    AuthService.getCompanyUsers().then((res) => {
      const d = res.data as unknown
      setMembers((Array.isArray(d) ? d : (d as { results?: Member[] })?.results ?? []) as Member[])
    })
    inventoryService.getProducts({ is_active: true }, 1, 100).then((res) => setProducts(res.data ?? []))
  }, [orderId, fetchOrderById])

  const steps = useMemo(() => order?.production_steps ?? [], [order])
  const materials = order?.production_materials ?? []

  if (initialLoad) return <DetailSkeleton />
  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order not found" back={{ href: '/production/orders', label: 'Production orders' }} />
        <ErrorBanner title="Couldn’t load this production order" message={error || 'It may have been deleted.'} onRetry={refresh} />
      </div>
    )
  }

  const isPlanned = order.status === 'PLANNED'
  const inProgress = order.status === 'IN_PROGRESS'
  const isOpen = isPlanned || inProgress
  const openSteps = steps.filter((s) => s.status === 'PENDING' || s.status === 'IN_PROGRESS')
  const short = isPlanned && !order.materials_sufficient
  const canComplete = inProgress && openSteps.length === 0 && !!order.output_warehouse_id
  const output = order.output_warehouse_name

  const dialogs: Record<OrderAction, { title: string; description: string; confirm: string }> = {
    start: {
      title: 'Start production?',
      description: materials.length
        ? `This takes ${materials.length} ${materials.length === 1 ? 'material' : 'materials'} out of stock now and begins the first step.`
        : 'This order has no raw materials listed, so no stock is taken. The first step begins now.',
      confirm: 'Start production',
    },
    complete: { title: 'Complete production?', description: `${formatCount(order.quantity)} × ${order.product_name} will be added to ${output ?? 'the output warehouse'}.`, confirm: 'Complete & stock' },
    cancel: {
      title: 'Cancel this order?',
      description: order.materials_consumed ? 'The materials taken from stock are put back in their warehouses.' : 'No stock has been taken yet, so nothing changes in your warehouses.',
      confirm: 'Cancel order',
    },
    delete: { title: 'Delete this order?', description: 'This removes the order with its steps and materials. No stock is affected.', confirm: 'Delete' },
  }

  const runOrderAction = async () => {
    if (!pending) return
    setBusy(true)
    setActionError(null)
    setNotice(null)
    try {
      if (pending === 'delete') {
        await deleteOrder(orderId)
        router.push('/production/orders')
        return
      }
      if (pending === 'start') await startProduction(orderId)
      if (pending === 'cancel') await cancelProduction(orderId)
      if (pending === 'complete') {
        const res = await completeProduction(orderId)
        const u = res?.inventory_updated
        if (u) setNotice(`${formatCount(u.quantity_added)} × ${u.product} added to ${u.warehouse}. It now holds ${formatCount(u.new_total)}.`)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That didn’t work. Please try again.')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const stepAction = async (step: ProductionStep, action: 'start' | 'complete' | 'skip' | 'delete') => {
    setBusyStep(step.id)
    setActionError(null)
    try {
      if (action === 'start') await productionService.steps.startStep(step.id)
      if (action === 'complete') await productionService.steps.completeStep(step.id)
      if (action === 'skip') await productionService.steps.skipStep(step.id)
      if (action === 'delete') await productionService.steps.delete(step.id)
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusyStep(null)
    }
  }

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stepForm?.name.trim()) return
    setBusyStep('new')
    setActionError(null)
    try {
      await productionService.steps.create({
        production_order_id: orderId,
        name: stepForm.name.trim(),
        duration_hours: stepForm.hours ? stepForm.hours : null,
        assigned_to_id: stepForm.assignee || null,
      })
      setStepForm(null)
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Couldn’t add the step.')
    } finally {
      setBusyStep(null)
    }
  }

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialForm?.product || !materialForm.warehouse || !Number(materialForm.qty)) return
    setBusyStep('new-material')
    setActionError(null)
    try {
      await productionService.materials.create({
        production_order_id: orderId, product_id: materialForm.product, warehouse_id: materialForm.warehouse, quantity: Number(materialForm.qty),
      })
      setMaterialForm(null)
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Couldn’t add the material.')
    } finally {
      setBusyStep(null)
    }
  }

  const removeMaterial = async (id: string) => {
    setBusyStep(id)
    setActionError(null)
    try {
      await productionService.materials.delete(id)
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Couldn’t remove the material.')
    } finally {
      setBusyStep(null)
    }
  }

  const facts = [
    { label: order.status === 'COMPLETED' ? 'Finished' : 'Target end', value: order.end_date ? formatDay(order.end_date) : 'No target' },
    { label: order.start_date && !isPlanned ? 'Started' : 'Planned start', value: order.start_date ? formatDay(order.start_date) : 'Not set' },
    { label: 'Est. completion', value: order.estimated_completion && inProgress ? formatDateTime(order.estimated_completion) : '—' },
    { label: 'Material cost', value: formatMoney(order.total_material_cost) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        back={{ href: '/production/orders', label: 'Production orders' }}
        title={order.order_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusPill status={order.status} />
            <span>Created {timeAgo(order.created_at)}{order.created_by_name ? ` by ${order.created_by_name}` : ''}</span>
          </span>
        }
        actions={
          <>
            {isOpen && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/production/orders/${orderId}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
            )}
            {(isPlanned || order.status === 'CANCELLED') && (
              <Button variant="outline" size="sm" className="text-danger hover:text-danger" onClick={() => setPending('delete')}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
            )}
            {isOpen && <Button variant="outline" size="sm" onClick={() => setPending('cancel')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
            {isPlanned && (
              <Button size="sm" disabled={short} onClick={() => setPending('start')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
                <Play className="mr-2 h-4 w-4" />Start production
              </Button>
            )}
            {inProgress && (
              <Button size="sm" disabled={!canComplete} onClick={() => setPending('complete')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"
                title={!canComplete ? (openSteps.length ? 'Finish or skip every step first' : 'Choose an output warehouse first') : undefined}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Complete &amp; stock
              </Button>
            )}
          </>
        }
      />

      {actionError && <ErrorBanner title="Action failed" message={actionError} />}
      {notice && (
        <FadeIn>
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" /><span className="font-medium">{notice}</span>
          </div>
        </FadeIn>
      )}
      {short && (
        <FadeIn>
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p><span className="font-medium">Not enough materials to start.</span> <span className="opacity-90">Restock the items marked below or reduce their quantities.</span></p>
          </div>
        </FadeIn>
      )}
      {isOpen && !order.output_warehouse_id && (
        <FadeIn>
          <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
            <Warehouse className="mt-0.5 h-5 w-5 shrink-0" />
            <p><span className="font-medium">No output warehouse yet.</span> <span className="opacity-90">Choose where the finished goods go (Edit) before completing.</span></p>
          </div>
        </FadeIn>
      )}
      {order.status === 'CANCELLED' && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          <Ban className="h-5 w-5 text-muted-foreground" /><span>This order was cancelled. Any materials it had taken were returned to stock.</span>
        </div>
      )}

      {/* Summary */}
      <Panel delay={0.05} bodyClassName="p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <ProgressRing value={order.progress_percentage} size={84} stroke={8} />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Making</p>
              <p className="text-xl font-semibold">{order.product_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCount(order.quantity)} {order.unit_of_measure || 'units'} · {order.steps_done}/{order.steps_total} steps · into <span className={cn(!output && 'text-warning')}>{output ?? 'no warehouse yet'}</span>
              </p>
            </div>
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Steps */}
        <Panel
          className="lg:col-span-3"
          icon={ListChecks}
          title="Steps"
          description={inProgress ? 'Work through them in order; finishing one starts the next' : isPlanned ? 'They begin when production starts' : undefined}
          delay={0.1}
          action={isOpen && !stepForm ? (
            <Button size="sm" variant="outline" onClick={() => setStepForm({ name: '', hours: '', assignee: '' })}><Plus className="mr-1.5 h-4 w-4" />Add step</Button>
          ) : undefined}
        >
          {steps.length === 0 && !stepForm && (
            <p className="py-6 text-center text-sm text-muted-foreground">No steps. Add the stages this run goes through, e.g. Mix → Bake → Pack.</p>
          )}
          <ol className="relative space-y-3">
            {steps.map((s, i) => {
              const done = s.status === 'COMPLETED' || s.status === 'SKIPPED'
              const working = s.status === 'IN_PROGRESS'
              return (
                <motion.li key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  className={cn('relative flex gap-3 rounded-xl border p-3 transition-colors', working && 'border-brand/40 bg-brand-soft/40', done && 'bg-muted/30')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    s.status === 'COMPLETED' && 'border-brand bg-brand text-brand-foreground',
                    s.status === 'SKIPPED' && 'border-warning/50 text-warning',
                    working && 'border-brand text-brand',
                    s.status === 'PENDING' && 'text-muted-foreground')}>
                    {s.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4" /> : s.status === 'SKIPPED' ? <SkipForward className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('font-medium', s.status === 'SKIPPED' && 'text-muted-foreground line-through')}>{s.name}</p>
                      <StepStatusPill status={s.status} />
                      {s.is_overdue && <span className="text-xs font-medium text-danger">Over estimate</span>}
                    </div>
                    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {s.assigned_to_name && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{s.assigned_to_name}</span>}
                      {s.duration_hours !== null && <span>Est. {Number(s.duration_hours)} h</span>}
                      {s.actual_duration_hours !== null && <span>Took {hoursLabel(Number(s.actual_duration_hours))}</span>}
                      {working && s.start_time && <span>Started {timeAgo(s.start_time)}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    {busyStep === s.id ? <Loader2 className="m-2 h-4 w-4 animate-spin text-muted-foreground" /> : (
                      <>
                        {inProgress && s.status === 'PENDING' && (
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => stepAction(s, 'start')}><Play className="mr-1 h-3.5 w-3.5" />Start</Button>
                        )}
                        {inProgress && working && (
                          <Button size="sm" className="h-8 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => stepAction(s, 'complete')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Done</Button>
                        )}
                        {inProgress && (s.status === 'PENDING' || working) && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => stepAction(s, 'skip')} aria-label={`Skip ${s.name}`} title="Skip"><SkipForward className="h-3.5 w-3.5" /></Button>
                        )}
                        {isOpen && s.status === 'PENDING' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={() => stepAction(s, 'delete')} aria-label={`Remove ${s.name}`} title="Remove"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ol>
          <AnimatePresence>
            {stepForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={addStep} className="overflow-hidden">
                <div className="mt-3 grid gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-5">
                    <Label htmlFor="step-name" className="text-xs">Step name</Label>
                    <Input id="step-name" autoFocus value={stepForm.name} onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })} placeholder="e.g. Packaging" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="step-hours" className="text-xs">Est. hours</Label>
                    <Input id="step-hours" type="number" min={0} step="0.25" value={stepForm.hours} onChange={(e) => setStepForm({ ...stepForm, hours: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-5">
                    <Label htmlFor="step-assignee" className="text-xs">Assigned to</Label>
                    <Select value={stepForm.assignee || 'none'} onValueChange={(v) => setStepForm({ ...stepForm, assignee: v === 'none' ? '' : v })}>
                      <SelectTrigger id="step-assignee" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nobody yet</SelectItem>
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 sm:col-span-12">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStepForm(null)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={!stepForm.name.trim() || busyStep === 'new'} className="bg-brand text-brand-foreground hover:bg-brand/90">
                      {busyStep === 'new' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}Add step
                    </Button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Panel>

        {/* Materials */}
        <Panel
          className="lg:col-span-2"
          icon={Layers}
          title="Raw materials"
          description={order.materials_consumed ? 'Taken from stock when production started' : isPlanned ? 'Taken from stock when production starts' : undefined}
          delay={0.15}
          bodyClassName="p-0"
          action={isPlanned && !materialForm ? (
            <Button size="sm" variant="outline" onClick={() => setMaterialForm({ product: '', warehouse: warehouses[0]?.id ?? '', qty: '1' })}><Plus className="mr-1.5 h-4 w-4" />Add</Button>
          ) : undefined}
        >
          {materials.length === 0 && !materialForm ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No raw materials listed.</p>
          ) : (
            <ul className="divide-y">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', order.materials_consumed ? 'bg-muted text-muted-foreground' : m.sufficient_stock ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    <Boxes className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.product_name} <span className="font-normal text-muted-foreground">× {formatCount(m.quantity)}</span></p>
                    <p className={cn('truncate text-xs', !order.materials_consumed && isOpen && !m.sufficient_stock ? 'font-medium text-danger' : 'text-muted-foreground')}>
                      {m.warehouse_name}
                      {!order.materials_consumed && isOpen && ` · ${formatCount(m.available_stock)} in stock${m.sufficient_stock ? '' : ` (${formatCount(m.quantity - m.available_stock)} short)`}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatMoney(m.material_cost)}</span>
                  {isPlanned && (
                    busyStep === m.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-danger" onClick={() => removeMaterial(m.id)} aria-label={`Remove ${m.product_name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
          <AnimatePresence>
            {materialForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={addMaterial} className="overflow-hidden border-t">
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-product" className="text-xs">Material</Label>
                    <Select value={materialForm.product} onValueChange={(v) => setMaterialForm({ ...materialForm, product: v })}>
                      <SelectTrigger id="mat-product" className="w-full"><SelectValue placeholder="Choose a product" /></SelectTrigger>
                      <SelectContent>
                        {products.filter((p) => p.id !== order.product_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="mat-wh" className="text-xs">From warehouse</Label>
                      <Select value={materialForm.warehouse} onValueChange={(v) => setMaterialForm({ ...materialForm, warehouse: v })}>
                        <SelectTrigger id="mat-wh" className="w-full"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                        <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mat-qty" className="text-xs">Qty</Label>
                      <Input id="mat-qty" type="number" min={1} value={materialForm.qty} onChange={(e) => setMaterialForm({ ...materialForm, qty: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMaterialForm(null)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={!materialForm.product || !materialForm.warehouse || !Number(materialForm.qty) || busyStep === 'new-material'} className="bg-brand text-brand-foreground hover:bg-brand/90">
                      {busyStep === 'new-material' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}Add material
                    </Button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          {materials.length > 0 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 text-sm">
              <span className="text-muted-foreground">Material cost</span>
              <span className="font-semibold tabular-nums">{formatMoney(order.total_material_cost)}</span>
            </div>
          )}
        </Panel>
      </div>

      {order.notes && (
        <Panel icon={ClipboardList} title="Notes" delay={0.2}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes}</p>
        </Panel>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !busy && setPending(null)}
        title={pending ? dialogs[pending].title : ''}
        description={pending ? dialogs[pending].description : ''}
        confirmText={pending ? dialogs[pending].confirm : undefined}
        onConfirm={runOrderAction}
        loading={busy}
        variant={pending === 'delete' || pending === 'cancel' ? 'destructive' : 'default'}
      />
    </div>
  )
}
