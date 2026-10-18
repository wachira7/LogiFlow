// src/app/inventory/inventory-items/new/page.tsx
// Start stocking an existing product in a warehouse, with an opening quantity.
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInventoryItems, useWarehouses } from '@/hooks/useInventory'
import { inventoryService } from '@/services/inventoryService'
import type { Product } from '@/types/inventory.types'

export default function NewInventoryItemPage() {
  const router = useRouter()
  const { createInventoryItem, inventoryItems } = useInventoryItems()
  const { warehouses } = useWarehouses()
  const [products, setProducts] = useState<Product[]>([])

  // Up to 100 active products for the picker
  useEffect(() => {
    inventoryService.getProducts({ is_active: true }, 1, 100).then((res) => setProducts(res.data ?? []))
  }, [])
  const [form, setForm] = useState({ product_id: '', warehouse_id: '', quantity: '', location: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Warn early if this product is already stocked in the chosen warehouse
  const alreadyStocked = useMemo(
    () => inventoryItems.some((i) => i.product_id === form.product_id && i.warehouse_id === form.warehouse_id),
    [inventoryItems, form.product_id, form.warehouse_id],
  )
  const product = products.find((p) => p.id === form.product_id)

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '', submit: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.product_id) next.product_id = 'Choose a product'
    if (!form.warehouse_id) next.warehouse_id = 'Choose a warehouse'
    const qty = form.quantity === '' ? 0 : Number(form.quantity)
    if (!Number.isInteger(qty) || qty < 0) next.quantity = 'Enter a whole number of units'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await createInventoryItem({ product_id: form.product_id, warehouse_id: form.warehouse_id, quantity: qty, location: form.location })
      router.push('/inventory/inventory-items')
    } catch (error) {
      setErrors({ submit: error instanceof Error && error.message ? error.message : 'Couldn’t add this stock line.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/inventory/inventory-items">
          <Button variant="ghost" size="icon" aria-label="Back to inventory items"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock a Product</h1>
          <p className="text-muted-foreground">Start holding a product in a warehouse, with the quantity you have now.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" /> Stock line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {errors.submit && (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="product_id">Product</Label>
              <Select value={form.product_id} onValueChange={(v) => set('product_id', v)}>
                <SelectTrigger id="product_id" className="w-full"><SelectValue placeholder="Choose a product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.product_id && <p className="text-sm text-danger">{errors.product_id}</p>}
              <p className="text-xs text-muted-foreground">
                New product? <Link href="/inventory/products/new" className="font-medium text-brand hover:underline">Create it first</Link>; you can add opening stock there too.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="warehouse_id">Warehouse</Label>
                <Select value={form.warehouse_id} onValueChange={(v) => set('warehouse_id', v)}>
                  <SelectTrigger id="warehouse_id" className="w-full"><SelectValue placeholder="Choose a warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.warehouse_id && <p className="text-sm text-danger">{errors.warehouse_id}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity on hand{product?.unit_of_measure ? ` (${product.unit_of_measure})` : ''}</Label>
                <Input id="quantity" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
                {errors.quantity && <p className="text-sm text-danger">{errors.quantity}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Bin / shelf (optional)</Label>
              <Input id="location" placeholder="e.g. Aisle 3, Shelf B" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>

            {alreadyStocked && (
              <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
                This product is already stocked in that warehouse. Use <strong>Adjust stock</strong> on the inventory list to change its quantity.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/inventory/inventory-items')}>Cancel</Button>
              <Button type="submit" disabled={saving || alreadyStocked} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {saving ? 'Saving…' : 'Add stock line'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
