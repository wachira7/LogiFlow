// src/components/warehousing/TransferForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowRightLeft, Loader2, Package, Plus, Trash2, Warehouse } from 'lucide-react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { useWarehouses } from '@/hooks/useInventory'
import { inventoryService } from '@/services/inventoryService'
import warehousingService from '@/services/warehousingService'
import type { Product } from '@/types/inventory.types'
import type { CreateTransferItemData, CreateWarehouseTransferData } from '@/types/warehousing.types'
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

interface TransferFormProps {
  transferId?: string
  isEdit?: boolean
}

interface ItemRow extends CreateTransferItemData {
  id: string
}

const newRow = (): ItemRow => ({ id: `temp-${crypto.randomUUID()}`, product_id: '', quantity: 1, source_location: '', destination_location: '' })

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-danger">{message}</p> : null
}

export function TransferForm({ transferId, isEdit = false }: TransferFormProps) {
  const router = useRouter()
  const { createTransfer, updateTransfer, fetchTransferById, currentTransfer } = useWarehouseTransfers()
  const { warehouses = [], isLoading: warehousesLoading } = useWarehouses()

  // Up to 100 active products for the picker (the products hook only loads the first page)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [transferLoading, setTransferLoading] = useState(isEdit)
  const [form, setForm] = useState({ transfer_number: '', source_warehouse_id: '', destination_warehouse_id: '', notes: '' })
  const [rows, setRows] = useState<ItemRow[]>(isEdit ? [] : [newRow()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  // product id → units held in the chosen source warehouse
  const [available, setAvailable] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    inventoryService.getProducts({ is_active: true }, 1, 100)
      .then((res) => setProducts(res.data ?? []))
      .finally(() => setProductsLoading(false))
  }, [])

  useEffect(() => {
    if (isEdit && transferId) fetchTransferById(transferId).catch(() => {}).finally(() => setTransferLoading(false))
  }, [isEdit, transferId, fetchTransferById])

  useEffect(() => {
    if (!isEdit || !currentTransfer) return
    setForm({
      transfer_number: currentTransfer.transfer_number,
      source_warehouse_id: currentTransfer.source_warehouse_id,
      destination_warehouse_id: currentTransfer.destination_warehouse_id,
      notes: currentTransfer.notes || '',
    })
    setRows(currentTransfer.transfer_items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      source_location: item.source_location || '',
      destination_location: item.destination_location || '',
    })))
  }, [isEdit, currentTransfer])

  // Stock on hand in the source warehouse, so people see shortages before approving
  useEffect(() => {
    if (!form.source_warehouse_id) {
      setAvailable(null)
      return
    }
    let cancelled = false
    setAvailable(null)
    inventoryService.getInventoryItems({ warehouse: form.source_warehouse_id }, 1, 100).then((res) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      for (const line of res.data ?? []) map[line.product_id] = line.quantity
      setAvailable(map)
    })
    return () => {
      cancelled = true
    }
  }, [form.source_warehouse_id])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const units = rows.reduce((sum, r) => sum + (r.quantity || 0), 0)
  const value = rows.reduce((sum, r) => sum + (r.quantity || 0) * toNumber(productById.get(r.product_id)?.cost_price), 0)
  const source = warehouses.find((w) => w.id === form.source_warehouse_id)
  const destination = warehouses.find((w) => w.id === form.destination_warehouse_id)

  const setField = (field: keyof typeof form, v: string) => {
    setForm((prev) => ({ ...prev, [field]: v }))
    setErrors((prev) => ({ ...prev, [field]: '', submit: '' }))
  }

  const updateRow = (id: string, field: keyof ItemRow, v: string | number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: v } : r)))
    setErrors((prev) => ({ ...prev, transfer_items: '', submit: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.source_warehouse_id) next.source_warehouse_id = 'Choose where the stock comes from'
    if (!form.destination_warehouse_id) next.destination_warehouse_id = 'Choose where it goes'
    if (form.source_warehouse_id && form.source_warehouse_id === form.destination_warehouse_id) {
      next.destination_warehouse_id = 'Pick a different warehouse from the source'
    }
    if (rows.length === 0) next.transfer_items = 'Add at least one product'
    const chosen = rows.map((r) => r.product_id).filter(Boolean)
    if (new Set(chosen).size !== chosen.length) next.transfer_items = 'Each product can only appear once; combine the quantities into one line'
    rows.forEach((r, i) => {
      if (!r.product_id) next[`item_${i}_product`] = 'Choose a product'
      if (!Number.isInteger(r.quantity) || r.quantity < 1) next[`item_${i}_quantity`] = 'At least 1'
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // Edit mode: apply item changes (new rows have temp- ids; removed rows are deleted)
  const syncItems = async (id: string) => {
    const original = currentTransfer?.transfer_items ?? []
    const kept = new Set(rows.filter((r) => !r.id.startsWith('temp-')).map((r) => r.id))
    for (const old of original) {
      if (!kept.has(old.id)) await warehousingService.items.delete(old.id)
    }
    for (const r of rows) {
      const data = { product_id: r.product_id, quantity: r.quantity, source_location: r.source_location, destination_location: r.destination_location }
      if (r.id.startsWith('temp-')) {
        await warehousingService.items.create({ ...data, transfer_id: id })
      } else {
        const before = original.find((o) => o.id === r.id)
        const changed = before && (before.product_id !== r.product_id || before.quantity !== r.quantity ||
          (before.source_location ?? '') !== (r.source_location ?? '') ||
          (before.destination_location ?? '') !== (r.destination_location ?? ''))
        if (changed) await warehousingService.items.update(r.id, data)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEdit && transferId) {
        await updateTransfer(transferId, form)
        await syncItems(transferId)
        router.push(`/warehousing/transfers/${transferId}`)
      } else {
        const data: CreateWarehouseTransferData = {
          ...form,
          transfer_items: rows.map(({ product_id, quantity, source_location, destination_location }) => ({ product_id, quantity, source_location, destination_location })),
        }
        const created = await createTransfer(data)
        router.push(created?.id ? `/warehousing/transfers/${created.id}` : '/warehousing/transfers')
      }
    } catch (error) {
      setErrors({ submit: error instanceof Error && error.message ? error.message : 'Couldn’t save the transfer. Please try again.' })
      setSubmitting(false)
    }
  }

  const back = isEdit && transferId ? { href: `/warehousing/transfers/${transferId}`, label: 'Back to transfer' } : { href: '/warehousing/transfers', label: 'Transfers' }

  if (warehousesLoading || productsLoading || transferLoading) {
    return (
      <div className="space-y-6" aria-busy aria-label="Loading form">
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-64" /></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isEdit && currentTransfer && currentTransfer.status !== 'PENDING') {
    return (
      <div className="space-y-6">
        <PageHeader icon={ArrowRightLeft} title={`Edit ${currentTransfer.transfer_number}`} back={back} />
        <ErrorBanner title="This transfer can’t be edited" message="Only pending transfers can be changed. Once approved, its stock has already left the source warehouse." />
      </div>
    )
  }

  if (warehouses.length < 2) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ArrowRightLeft} title="New transfer" back={back} />
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Warehouse className="h-6 w-6" /></span>
            <p className="font-medium">You need at least two warehouses</p>
            <p className="max-w-sm text-sm text-muted-foreground">Transfers move stock from one warehouse to another. Add another warehouse first.</p>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/inventory/warehouses/new">Add a warehouse</Link></Button>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowRightLeft}
        back={back}
        title={isEdit ? `Edit ${form.transfer_number || 'transfer'}` : 'New transfer'}
        description={isEdit ? 'Change the route, items or notes while it’s still pending.' : 'Stock leaves the source when the transfer is approved, and arrives when it’s marked received.'}
      />

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={Warehouse} title="Route" delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <div className="space-y-1.5">
                <Label htmlFor="source_warehouse">From</Label>
                <Select value={form.source_warehouse_id} onValueChange={(v) => setField('source_warehouse_id', v)}>
                  <SelectTrigger id="source_warehouse" className={cn('w-full', errors.source_warehouse_id && 'border-danger')}><SelectValue placeholder="Source warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError message={errors.source_warehouse_id} />
              </div>
              <span className="mx-auto hidden h-9 w-9 items-center justify-center self-end rounded-full bg-brand-soft text-brand sm:flex">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              <div className="space-y-1.5">
                <Label htmlFor="destination_warehouse">To</Label>
                <Select value={form.destination_warehouse_id} onValueChange={(v) => setField('destination_warehouse_id', v)}>
                  <SelectTrigger id="destination_warehouse" className={cn('w-full', errors.destination_warehouse_id && 'border-danger')}><SelectValue placeholder="Destination warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((w) => w.id !== form.source_warehouse_id).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError message={errors.destination_warehouse_id} />
              </div>
            </div>
          </Panel>

          <Panel
            icon={Package}
            title="Items"
            description={form.source_warehouse_id ? `Stock shown is what ${source?.name ?? 'the source'} holds now` : 'Choose the source warehouse to see stock on hand'}
            delay={0.1}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, newRow()])}>
                <Plus className="mr-1.5 h-4 w-4" />Add product
              </Button>
            }
          >
            {errors.transfer_items && (
              <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                <AlertTriangle className="h-4 w-4 shrink-0" />{errors.transfer_items}
              </p>
            )}
            {rows.length === 0 ? (
              <button type="button" onClick={() => setRows([newRow()])} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand">
                <Plus className="h-5 w-5" />Add the first product
              </button>
            ) : (
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {rows.map((row, i) => {
                    const product = productById.get(row.product_id)
                    const have = row.product_id && available ? available[row.product_id] ?? 0 : null
                    const short = have !== null && row.quantity > have
                    return (
                      <motion.li
                        key={row.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                        className="rounded-xl border bg-muted/20 p-3 sm:p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-12">
                          <div className="space-y-1.5 sm:col-span-7">
                            <Label htmlFor={`product-${row.id}`} className="text-xs">Product</Label>
                            <Select value={row.product_id} onValueChange={(v) => updateRow(row.id, 'product_id', v)}>
                              <SelectTrigger id={`product-${row.id}`} className={cn('w-full bg-card', errors[`item_${i}_product`] && 'border-danger')}><SelectValue placeholder="Choose a product" /></SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id} disabled={rows.some((r) => r.id !== row.id && r.product_id === p.id)}>
                                    {p.name} · {p.sku}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={errors[`item_${i}_product`]} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-3">
                            <Label htmlFor={`qty-${row.id}`} className="text-xs">Quantity{product?.unit_of_measure ? ` (${product.unit_of_measure})` : ''}</Label>
                            <Input id={`qty-${row.id}`} type="number" min={1} inputMode="numeric" value={row.quantity || ''}
                              onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                              className={cn('bg-card', (errors[`item_${i}_quantity`] || short) && 'border-danger')} />
                            {errors[`item_${i}_quantity`] ? <FieldError message={errors[`item_${i}_quantity`]} /> : have !== null && (
                              <p className={cn('text-xs', short ? 'font-medium text-danger' : 'text-muted-foreground')}>
                                {formatCount(have)} available{short ? ` · ${formatCount(row.quantity - have)} short` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-end justify-end sm:col-span-2">
                            <Button type="button" variant="ghost" size="icon" onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                              className="text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove product">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1.5 sm:col-span-6">
                            <Label htmlFor={`from-bin-${row.id}`} className="text-xs text-muted-foreground">Bin in source (optional)</Label>
                            <Input id={`from-bin-${row.id}`} value={row.source_location} onChange={(e) => updateRow(row.id, 'source_location', e.target.value)} placeholder="e.g. A-1-2" className="bg-card" />
                          </div>
                          <div className="space-y-1.5 sm:col-span-6">
                            <Label htmlFor={`to-bin-${row.id}`} className="text-xs text-muted-foreground">Bin at destination (optional)</Label>
                            <Input id={`to-bin-${row.id}`} value={row.destination_location} onChange={(e) => updateRow(row.id, 'destination_location', e.target.value)} placeholder="e.g. B-3-1" className="bg-card" />
                          </div>
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details" delay={0.15}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="transfer_number">Transfer number <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="transfer_number" value={form.transfer_number} onChange={(e) => setField('transfer_number', e.target.value)}
                  placeholder={isEdit ? '' : 'Numbered automatically'} className={cn(errors.transfer_number && 'border-danger')} />
                <FieldError message={errors.transfer_number} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Driver, vehicle, reason for the move…" rows={3} />
              </div>
            </div>
          </Panel>

          <FadeIn delay={0.2} className="sticky top-20 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Summary</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate">{source?.name ?? 'Source'}</span>
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-brand" />
              <span className="truncate">{destination?.name ?? 'Destination'}</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-y py-3 text-center">
              <div><dt className="text-xs text-muted-foreground">Products</dt><dd className="font-semibold tabular-nums">{rows.filter((r) => r.product_id).length}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Units</dt><dd className="font-semibold tabular-nums">{formatCount(units)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Value</dt><dd className="truncate font-semibold tabular-nums">{formatMoney(value, undefined, { maximumFractionDigits: 0 })}</dd></div>
            </dl>
            {errors.submit && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <Button type="submit" disabled={submitting} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</> : isEdit ? 'Save changes' : 'Create transfer'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => router.push(back.href)} disabled={submitting}>Cancel</Button>
          </FadeIn>
        </div>
      </form>
    </div>
  )
}
