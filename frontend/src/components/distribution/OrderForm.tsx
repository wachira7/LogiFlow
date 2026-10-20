// src/components/distribution/OrderForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardList, Loader2, MapPin, Package, Plus, Trash2, User } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { inventoryService } from '@/services/inventoryService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderDetail } from '@/types/distribution.types'
import type { Product } from '@/types/inventory.types'

type Line = { key: string; product: string; qty: string; price: string }
const key = () => crypto.randomUUID()

export function OrderForm({ orderId }: { orderId?: string }) {
  const router = useRouter()
  const editing = !!orderId
  const [products, setProducts] = useState<Product[]>([])
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ order_number: '', customer_name: '', customer_email: '', customer_phone: '', shipping_address: '', billing_address: '', tax: '', shipping: '', discount: '', notes: '' })
  const [lines, setLines] = useState<Line[]>([{ key: key(), product: '', qty: '1', price: '' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      inventoryService.getProducts({ is_active: true }, 1, 100).then((r) => setProducts(r.data ?? [])),
      orderId ? distributionService.order(orderId).then((o) => {
        setOrder(o)
        setF({ order_number: o.order_number, customer_name: o.customer_name, customer_email: o.customer_email, customer_phone: o.customer_phone, shipping_address: o.shipping_address,
          billing_address: o.billing_address, tax: String(toNumber(o.tax_amount) || ''), shipping: String(toNumber(o.shipping_amount) || ''), discount: String(toNumber(o.discount_amount) || ''), notes: o.notes })
        setLines(o.order_items.map((i) => ({ key: key(), product: i.product_id, qty: String(i.quantity), price: String(toNumber(i.unit_price)) })))
      }) : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }, [orderId])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (l.price === '' ? toNumber(byId.get(l.product)?.unit_price) : Number(l.price)), 0)
  const total = subtotal + (Number(f.tax) || 0) + (Number(f.shipping) || 0) - (Number(f.discount) || 0)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: '', submit: '' })) }
  const setLine = (k: string, field: keyof Line, v: string) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, [field]: v, ...(field === 'product' ? { price: '' } : {}) } : l)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!f.customer_name.trim()) next.customer_name = 'Who is the order for?'
    if (!/^\S+@\S+\.\S+$/.test(f.customer_email)) next.customer_email = 'Enter a valid email'
    if (!f.shipping_address.trim()) next.shipping_address = 'Where should it go?'
    const used = lines.filter((l) => l.product)
    if (!used.length) next.items = 'Add at least one product'
    if (new Set(used.map((l) => l.product)).size !== used.length) next.items = 'Each product once; combine the quantities'
    if (used.some((l) => !(Number(l.qty) >= 1))) next.items = 'Quantities must be at least 1'
    if (total < 0) next.discount = 'The discount is larger than the order'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    const payload = {
      ...(f.order_number.trim() ? { order_number: f.order_number.trim() } : {}),
      customer_name: f.customer_name.trim(), customer_email: f.customer_email.trim(), customer_phone: f.customer_phone.trim(),
      shipping_address: f.shipping_address.trim(), billing_address: f.billing_address.trim(), notes: f.notes,
      tax_amount: f.tax || '0', shipping_amount: f.shipping || '0', discount_amount: f.discount || '0',
      order_items: used.map((l) => ({ product_id: l.product, quantity: Number(l.qty), ...(l.price !== '' ? { unit_price: l.price } : {}) })),
    }
    try {
      const saved = editing ? await distributionService.updateOrder(orderId!, payload) : await distributionService.createOrder(payload)
      router.push(`/distribution/orders/${saved.id}`)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Couldn’t save the order.' })
      setSaving(false)
    }
  }

  const back = editing ? { href: `/distribution/orders/${orderId}`, label: 'Back to order' } : { href: '/distribution/orders', label: 'Orders' }
  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 rounded-xl lg:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div></div>
  if (editing && order && !['NEW', 'PROCESSING'].includes(order.status)) {
    return <div className="space-y-6"><PageHeader icon={ClipboardList} title={`Edit ${order.order_number}`} back={back} /><ErrorBanner title="This order can’t be edited" message="It has already started shipping." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} back={back} title={editing ? `Edit ${f.order_number}` : 'New order'} description="The total is worked out from the products, tax, delivery and discount." />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={User} title="Customer" delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="o-name">Customer or business</Label><Input id="o-name" value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} className={cn(errors.customer_name && 'border-danger')} />{errors.customer_name && <p className="text-xs text-danger">{errors.customer_name}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="o-email">Email</Label><Input id="o-email" type="email" value={f.customer_email} onChange={(e) => set('customer_email', e.target.value)} className={cn(errors.customer_email && 'border-danger')} />{errors.customer_email && <p className="text-xs text-danger">{errors.customer_email}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="o-phone">Phone</Label><Input id="o-phone" inputMode="tel" value={f.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} placeholder="+254 7…" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="o-ship"><MapPin className="mr-1 inline h-3.5 w-3.5" />Deliver to</Label><Textarea id="o-ship" rows={2} value={f.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} placeholder="Building, street, town" className={cn(errors.shipping_address && 'border-danger')} />{errors.shipping_address && <p className="text-xs text-danger">{errors.shipping_address}</p>}</div>
            </div>
          </Panel>
          <Panel icon={Package} title="Products" delay={0.1} action={<Button type="button" size="sm" variant="outline" onClick={() => setLines((l) => [...l, { key: key(), product: '', qty: '1', price: '' }])}><Plus className="mr-1.5 h-4 w-4" />Add product</Button>}>
            {errors.items && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.items}</p>}
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {lines.map((l) => {
                  const p = byId.get(l.product)
                  const unit = l.price === '' ? toNumber(p?.unit_price) : Number(l.price)
                  return (
                    <motion.li key={l.key} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }} className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-12">
                      <div className="space-y-1.5 sm:col-span-6"><Label htmlFor={`p-${l.key}`} className="text-xs">Product</Label>
                        <Select value={l.product} onValueChange={(v) => setLine(l.key, 'product', v)}>
                          <SelectTrigger id={`p-${l.key}`} className="w-full bg-card"><SelectValue placeholder="Choose a product" /></SelectTrigger>
                          <SelectContent>{products.map((pr) => <SelectItem key={pr.id} value={pr.id} disabled={lines.some((x) => x.key !== l.key && x.product === pr.id)}>{pr.name} · {pr.sku}</SelectItem>)}</SelectContent>
                        </Select></div>
                      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`q-${l.key}`} className="text-xs">Qty</Label><Input id={`q-${l.key}`} type="number" min={1} value={l.qty} onChange={(e) => setLine(l.key, 'qty', e.target.value)} className="bg-card" /></div>
                      <div className="space-y-1.5 sm:col-span-3"><Label htmlFor={`u-${l.key}`} className="text-xs">Unit price</Label><Input id={`u-${l.key}`} type="number" min={0} step="0.01" value={l.price} placeholder={p ? String(toNumber(p.unit_price)) : ''} onChange={(e) => setLine(l.key, 'price', e.target.value)} className="bg-card" />
                        {p && <p className="text-xs text-muted-foreground">Line: {formatMoney((Number(l.qty) || 0) * unit)}</p>}</div>
                      <div className="flex items-end justify-end sm:col-span-1"><Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove product"><Trash2 className="h-4 w-4" /></Button></div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Details" delay={0.15}>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="o-num">Order number <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="o-num" value={f.order_number} onChange={(e) => set('order_number', e.target.value)} placeholder="Numbered automatically" /></div>
              <div className="space-y-1.5"><Label htmlFor="o-bill">Billing address <span className="font-normal text-muted-foreground">(if different)</span></Label><Textarea id="o-bill" rows={2} value={f.billing_address} onChange={(e) => set('billing_address', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="o-notes">Notes</Label><Textarea id="o-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            </div>
          </Panel>
          <FadeIn delay={0.2} className="sticky top-20 space-y-3 rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Total</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Products</dt><dd className="tabular-nums">{formatMoney(subtotal)}</dd></div>
              {([['tax', 'Tax'], ['shipping', 'Delivery'], ['discount', 'Discount']] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between gap-3"><dt><Label htmlFor={`o-${k}`} className="font-normal text-muted-foreground">{label}</Label></dt>
                  <dd><Input id={`o-${k}`} type="number" min={0} step="0.01" value={f[k]} onChange={(e) => set(k, e.target.value)} className={cn('h-8 w-28 text-right', errors[k] && 'border-danger')} placeholder="0" /></dd></div>
              ))}
              <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(total)}</dd></div>
            </dl>
            {errors.discount && <p className="text-xs text-danger">{errors.discount}</p>}
            {errors.submit && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <Button type="submit" disabled={saving} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Save changes' : 'Create order'}</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => router.push(back.href)}>Cancel</Button>
          </FadeIn>
        </div>
      </form>
    </div>
  )
}
