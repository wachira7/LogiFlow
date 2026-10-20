// src/components/inventory/ProductForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes, Loader2, Package, Tag, Warehouse as WarehouseIcon } from 'lucide-react'
import { toast } from 'sonner'
import { stockService, type StockCategory, type StockWarehouse } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { formatMoney, getCompanyCurrency } from '@/lib/format'

const UNITS = [['ea', 'Each'], ['box', 'Box'], ['case', 'Case'], ['pack', 'Pack'], ['kg', 'Kilogram'], ['g', 'Gram'], ['liter', 'Litre'], ['ml', 'Millilitre'], ['meter', 'Metre'], ['bag', 'Bag'], ['roll', 'Roll']] as const

const EMPTY = { name: '', sku: '', description: '', category_id: '', unit_of_measure: 'ea', cost_price: '', unit_price: '', barcode: '', weight: '', dimensions: '',
  min_stock_level: '', max_stock_level: '', reorder_point: '', lead_time_days: '', is_active: true }
type Fields = typeof EMPTY

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter()
  const [f, setF] = useState<Fields>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categories, setCategories] = useState<StockCategory[]>([])
  const [warehouses, setWarehouses] = useState<StockWarehouse[]>([])
  const [opening, setOpening] = useState({ warehouse_id: '', quantity: '', location: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | 'opening' | 'submit', string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      stockService.categories(), stockService.warehouses(),
      productId ? stockService.product(productId) : Promise.resolve(null),
    ]).then(([c, w, p]) => {
      setCategories(c); setWarehouses(w.filter((x) => x.is_active))
      if (w[0] && !productId) setOpening((o) => ({ ...o, warehouse_id: w.find((x) => x.is_active)?.id ?? '' }))
      if (p) {
        const s = (v: unknown) => (v === null || v === undefined || v === 0 ? '' : String(v))
        setF({ name: p.name, sku: p.sku, description: p.description ?? '', category_id: p.category_id ?? '', unit_of_measure: p.unit_of_measure || 'ea',
          cost_price: s(p.cost_price), unit_price: s(p.unit_price), barcode: p.barcode ?? '', weight: s(p.weight), dimensions: p.dimensions ?? '',
          min_stock_level: s(p.min_stock_level), max_stock_level: s(p.max_stock_level), reorder_point: s(p.reorder_point), lead_time_days: s(p.lead_time_days), is_active: p.is_active })
      }
    }).catch((err) => setLoadError(err instanceof Error ? err.message : 'Couldn’t load the form.')).finally(() => setLoading(false))
  }, [productId])

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }
  const int = (v: string) => (v === '' ? 0 : Math.floor(Number(v)))
  const cost = Number(f.cost_price) || 0
  const price = Number(f.unit_price) || 0

  const validate = () => {
    const e: typeof errors = {}
    if (!f.name.trim()) e.name = 'Give the product a name.'
    if (!f.sku.trim()) e.sku = 'Add a SKU so it can be found and scanned.'
    if (price < 0) e.unit_price = 'Price can’t be negative.'
    if (cost < 0) e.cost_price = 'Cost can’t be negative.'
    if (int(f.max_stock_level) > 0 && int(f.min_stock_level) > int(f.max_stock_level)) e.max_stock_level = 'Must be at least the minimum.'
    if (!productId && int(opening.quantity) > 0 && !opening.warehouse_id) e.opening = 'Choose where this stock is kept.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const data = {
      name: f.name.trim(), sku: f.sku.trim(), description: f.description, category_id: f.category_id || null, unit_of_measure: f.unit_of_measure,
      cost_price: String(cost), unit_price: String(price), barcode: f.barcode, weight: f.weight || null, dimensions: f.dimensions,
      min_stock_level: int(f.min_stock_level), max_stock_level: int(f.max_stock_level), reorder_point: int(f.reorder_point), lead_time_days: int(f.lead_time_days), is_active: f.is_active,
    }
    try {
      if (productId) {
        await stockService.updateProduct(productId, data)
        toast.success('Product saved')
        router.push(`/inventory/products/${productId}`)
      } else {
        const created = await stockService.createProduct(data)
        if (opening.warehouse_id && opening.quantity !== '') {
          try { await stockService.createLine({ product_id: created.id, warehouse_id: opening.warehouse_id, quantity: int(opening.quantity), location: opening.location }) }
          catch (err) { toast.error(`Product created, but the opening stock wasn’t added: ${err instanceof Error ? err.message : ''}`) }
        }
        toast.success(`${created.name} added`)
        router.push(`/inventory/products/${created.id}`)
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Couldn’t save the product.' })
      setSaving(false)
    }
  }

  const back = productId ? { href: `/inventory/products/${productId}`, label: 'Back to product' } : { href: '/inventory/products', label: 'Products' }
  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 rounded-xl lg:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div></div>
  if (loadError) return <div className="space-y-6"><PageHeader icon={Package} title="Product" back={back} /><ErrorBanner message={loadError} /></div>

  const field = (k: keyof Fields, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${k}`}>{label}</Label>
      <Input id={`p-${k}`} value={f[k] as string} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] ? <p className="text-xs text-danger">{errors[k]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} back={back} title={productId ? `Edit ${f.name || 'product'}` : 'New product'} description={productId ? 'Stock quantities change through adjustments, not here.' : 'Add it to the catalogue, and optionally receive opening stock.'} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={Package} title="Product" delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('name', 'Name', { placeholder: 'Maize flour 2kg', autoFocus: !productId })}</div>
              {field('sku', 'SKU', { placeholder: 'MF-2KG', className: 'font-mono uppercase' })}
              {field('barcode', 'Barcode', { inputMode: 'numeric' }, 'Optional; scanners search by this too.')}
              <div className="space-y-1.5"><Label htmlFor="p-cat">Category</Label>
                <Select value={f.category_id || 'none'} onValueChange={(v) => set('category_id', v === 'none' ? '' : v)}>
                  <SelectTrigger id="p-cat" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Uncategorised</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_path || c.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label htmlFor="p-unit">Unit</Label>
                <Select value={f.unit_of_measure} onValueChange={(v) => set('unit_of_measure', v)}>
                  <SelectTrigger id="p-unit" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(([k, l]) => <SelectItem key={k} value={k}>{l} ({k})</SelectItem>)}{!UNITS.some(([k]) => k === f.unit_of_measure) && <SelectItem value={f.unit_of_measure}>{f.unit_of_measure}</SelectItem>}</SelectContent>
                </Select></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="p-desc">Description</Label><Textarea id="p-desc" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
            </div>
          </Panel>
          <Panel icon={Boxes} title="Stock rules" description="Drive the reorder list and stock meters" delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {field('reorder_point', 'Reorder point', { type: 'number', min: 0, inputMode: 'numeric' }, 'Flag when stock falls to this.')}
              {field('min_stock_level', 'Min stock', { type: 'number', min: 0, inputMode: 'numeric' })}
              {field('max_stock_level', 'Max stock', { type: 'number', min: 0, inputMode: 'numeric' }, 'Reorders top up to this.')}
              {field('lead_time_days', 'Lead time (days)', { type: 'number', min: 0, inputMode: 'numeric' })}
              {field('weight', 'Weight (kg)', { type: 'number', min: 0, step: '0.001' })}
              <div className="sm:col-span-2 lg:col-span-3">{field('dimensions', 'Dimensions', { placeholder: '30 × 20 × 10 cm' })}</div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel icon={Tag} title="Pricing" description={`In ${getCompanyCurrency()}`} delay={0.1}>
            <div className="space-y-4">
              {field('cost_price', 'Cost', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' }, 'What one unit costs you; values stock.')}
              {field('unit_price', 'Selling price', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
              {cost > 0 && price > 0 && (
                <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Profit per unit</span>
                  <span className={price - cost < 0 ? 'font-medium text-danger' : 'font-medium text-success'}>{formatMoney(price - cost)} · {(((price - cost) / cost) * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </Panel>
          {!productId && (
            <Panel icon={WarehouseIcon} title="Opening stock" description="Optional, recorded as a receipt" delay={0.15}>
              {warehouses.length === 0 ? <p className="text-sm text-muted-foreground">Add a warehouse first to receive stock.</p> : (
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label htmlFor="o-wh">Warehouse</Label>
                    <Select value={opening.warehouse_id} onValueChange={(v) => setOpening((o) => ({ ...o, warehouse_id: v }))}>
                      <SelectTrigger id="o-wh" className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="o-qty">Quantity</Label><Input id="o-qty" type="number" min={0} inputMode="numeric" value={opening.quantity} onChange={(e) => setOpening((o) => ({ ...o, quantity: e.target.value }))} placeholder="0" /></div>
                    <div className="space-y-1.5"><Label htmlFor="o-bin">Bin</Label><Input id="o-bin" value={opening.location} onChange={(e) => setOpening((o) => ({ ...o, location: e.target.value }))} placeholder="A-03" /></div>
                  </div>
                  {errors.opening && <p className="text-xs text-danger">{errors.opening}</p>}
                </div>
              )}
            </Panel>
          )}
          <Panel delay={0.2}>
            <label className="flex items-center justify-between gap-3 text-sm"><span><span className="font-medium">Active</span><span className="block text-xs text-muted-foreground">Inactive products are hidden from new orders.</span></span>
              <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', v)} aria-label="Active" /></label>
            {errors.submit && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <div className="mt-4 flex gap-2 border-t pt-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => router.push(back.href)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="btn-shine flex-1 bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{productId ? 'Save' : 'Create product'}</Button>
            </div>
          </Panel>
        </div>
      </form>
    </div>
  )
}
