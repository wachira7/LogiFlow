// src/app/(app)/inventory/inventory-items/new/page.tsx
// Goods in: add stock of a product to a warehouse; it's recorded as a receipt.
'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownToLine, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { stockService, type StockProduct, type StockWarehouse } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import { formatCount } from '@/lib/format'

function ReceiveStock() {
  const router = useRouter()
  const params = useSearchParams()
  const [products, setProducts] = useState<StockProduct[] | null>(null)
  const [warehouses, setWarehouses] = useState<StockWarehouse[]>([])
  const [f, setF] = useState({ product_id: params.get('product') ?? '', warehouse_id: params.get('warehouse') ?? '', quantity: '', reference: '', location: '', notes: '' })
  const [onHand, setOnHand] = useState<{ quantity: number; location: string } | null | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([stockService.products({ is_active: 'true' }), stockService.warehouses()]).then(([p, w]) => {
      setProducts(p.results)
      const active = w.filter((x) => x.is_active)
      setWarehouses(active)
      setF((x) => ({ ...x, warehouse_id: x.warehouse_id || (active.length === 1 ? active[0].id : '') }))
    }).catch(() => setProducts([]))
  }, [])

  // What's already there, so the result of the receipt is clear
  useEffect(() => {
    setOnHand(undefined)
    if (!f.product_id || !f.warehouse_id) return
    stockService.lines({ product: f.product_id, warehouse: f.warehouse_id }).then((r) => {
      const l = r.results[0]
      setOnHand(l ? { quantity: l.quantity, location: l.location } : null)
    }).catch(() => setOnHand(null))
  }, [f.product_id, f.warehouse_id])

  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: '', submit: '' })) }
  const product = products?.find((p) => p.id === f.product_id)
  const qty = Math.floor(Number(f.quantity) || 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!f.product_id) next.product_id = 'Choose a product.'
    if (!f.warehouse_id) next.warehouse_id = 'Choose where it’s going.'
    if (qty < 1) next.quantity = 'Receive at least one unit.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      const r = await stockService.receive({ ...f, quantity: qty })
      toast.success(r.message)
      router.push(`/inventory/inventory-items/${r.item.id}`)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Couldn’t receive this stock.' })
      setSaving(false)
    }
  }

  if (!products) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-96 max-w-3xl rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <PageHeader icon={ArrowDownToLine} back={{ href: '/inventory/inventory-items', label: 'Stock levels' }} title="Receive stock"
        description="Goods in from a supplier or production. It adds to what’s on hand and is logged as a receipt." />
      <form onSubmit={submit} noValidate className="grid max-w-5xl gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-product">Product</Label>
              <Select value={f.product_id} onValueChange={(v) => set('product_id', v)}>
                <SelectTrigger id="r-product" className="w-full" aria-invalid={!!errors.product_id}><SelectValue placeholder="Choose a product" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
              </Select>
              {errors.product_id ? <p className="text-xs text-danger">{errors.product_id}</p> : <p className="text-xs text-muted-foreground">New product? <Link href="/inventory/products/new" className="font-medium text-brand hover:underline">Create it first</Link>.</p>}
            </div>
            <div className="space-y-1.5"><Label htmlFor="r-wh">Into warehouse</Label>
              <Select value={f.warehouse_id} onValueChange={(v) => set('warehouse_id', v)}>
                <SelectTrigger id="r-wh" className="w-full" aria-invalid={!!errors.warehouse_id}><SelectValue placeholder="Choose a warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.warehouse_id && <p className="text-xs text-danger">{errors.warehouse_id}</p>}
            </div>
            <div className="space-y-1.5"><Label htmlFor="r-qty">Quantity received{product ? ` (${product.unit_of_measure})` : ''}</Label>
              <Input id="r-qty" type="number" min={1} inputMode="numeric" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" aria-invalid={!!errors.quantity} />
              {errors.quantity && <p className="text-xs text-danger">{errors.quantity}</p>}
            </div>
            <div className="space-y-1.5"><Label htmlFor="r-ref">Reference</Label><Input id="r-ref" value={f.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Supplier invoice or PO number" /></div>
            <div className="space-y-1.5"><Label htmlFor="r-bin">Bin / shelf</Label><Input id="r-bin" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={onHand?.location || 'e.g. A-03'} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-notes">Notes</Label><Textarea id="r-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
          {errors.submit && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
          <div className="mt-5 flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Receive stock</Button>
          </div>
        </Panel>
        <FadeIn delay={0.1}>
          <div className="rounded-xl border bg-gradient-to-br from-brand/10 via-card to-card p-5 shadow-sm">
            <p className="text-sm font-medium">After this receipt</p>
            {onHand === undefined ? <p className="mt-2 text-sm text-muted-foreground">Choose a product and warehouse to see the result.</p> : (
              <>
                <div className="mt-3 flex items-center gap-3 text-2xl font-semibold tabular-nums">
                  <span className="text-muted-foreground">{formatCount(onHand?.quantity ?? 0)}</span>
                  <ArrowRight className="h-5 w-5 text-brand" />
                  <span>{formatCount((onHand?.quantity ?? 0) + qty)}</span>
                  <span className="text-sm font-normal text-muted-foreground">{product?.unit_of_measure}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{onHand ? 'Added to the existing stock line.' : 'First stock of this product here: a new stock line is created.'}</p>
              </>
            )}
          </div>
        </FadeIn>
      </form>
    </div>
  )
}

export default function ReceiveStockPage() {
  return <Suspense><ReceiveStock /></Suspense>
}
