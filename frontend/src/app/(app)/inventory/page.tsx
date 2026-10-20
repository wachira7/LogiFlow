// src/app/(app)/inventory/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowDownToLine, BarChart3, Boxes, Building2, Check, FolderTree, History, Package, PackageX, Plus, Wallet } from 'lucide-react'
import { stockService, type Movement, type StockReport } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { ActionTile, ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { BarList } from '@/components/analytics/Charts'
import { MovementFeed, StockMeter, TextLink } from '@/components/inventory/status'
import { cn } from '@/lib/utils'
import { formatCount, formatMoney, toNumber } from '@/lib/format'
import { useLiveRefresh } from '@/lib/realtime'

const money0 = (n: number) => formatMoney(n, undefined, { maximumFractionDigits: 0 })

export default function InventoryOverviewPage() {
  const [report, setReport] = useState<StockReport | null>(null)
  const [moves, setMoves] = useState<Movement[] | null>(null)
  const [counts, setCounts] = useState<{ categories: number; warehouses: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [r, m, c, w] = await Promise.all([
        stockService.report(), stockService.movements({ page_size: 8 }), stockService.categories(), stockService.warehouses(),
      ])
      setReport(r); setMoves(m.results); setCounts({ categories: c.length, warehouses: w.length })
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load inventory.') }
  }, [])
  useEffect(() => { load() }, [load])
  useLiveRefresh('inventory.movement', load, { ms: 1500 })

  const steps = report && counts ? [
    { title: 'Add a category', done: counts.categories > 0, href: '/inventory/categories/new', icon: FolderTree },
    { title: 'Add a warehouse', done: counts.warehouses > 0, href: '/inventory/warehouses/new', icon: Building2 },
    { title: 'Add a product', done: report.total_products > 0, href: '/inventory/products/new', icon: Package },
    { title: 'Receive stock', done: report.total_units > 0, href: '/inventory/inventory-items/new', icon: ArrowDownToLine },
  ] : []
  const next = steps.findIndex((s) => !s.done)

  return (
    <div className="space-y-6">
      <PageHeader icon={Boxes} title="Inventory" description="What you hold, where it sits and what needs reordering."
        actions={<>
          <Button variant="outline" asChild><Link href="/inventory/inventory-items/new"><ArrowDownToLine className="mr-2 h-4 w-4" />Receive stock</Link></Button>
          <Button asChild className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/inventory/products/new"><Plus className="mr-2 h-4 w-4" />New product</Link></Button>
        </>} />

      {error && <ErrorBanner title="Couldn’t load inventory" message={error} onRetry={load} />}

      {next >= 0 && (
        <FadeIn delay={0.05}>
          <div className="rounded-2xl border bg-gradient-to-br from-brand/10 via-card to-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">Set up inventory</p><p className="text-sm text-muted-foreground">{steps.filter((s) => s.done).length} of {steps.length} done. Each step unlocks the next.</p></div>
              <span className="text-2xl font-bold tabular-nums text-brand">{Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%</span>
            </div>
            <ol className="mt-4 grid gap-2 sm:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <Link href={s.href} aria-disabled={i > next} className={cn('flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors',
                    s.done ? 'text-muted-foreground' : i === next ? 'border-brand ring-2 ring-brand/20' : 'pointer-events-none opacity-50')}>
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', s.done ? 'bg-success-soft text-success' : i === next ? 'bg-brand text-brand-foreground' : 'bg-muted')}>
                      {s.done ? <Check className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn('font-medium', s.done && 'line-through')}>{s.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </FadeIn>
      )}

      {!report ? <StatGridSkeleton count={4} /> : (
        <StatGrid>
          <StatCard label="Stock value" value={toNumber(report.total_stock_value)} icon={Wallet} tone="brand" format={money0} hint={`${formatCount(report.total_units)} units at cost`} href="/inventory/reports" />
          <StatCard label="Products" value={report.active_products} icon={Package} tone="info" hint={report.inactive_products ? `${report.inactive_products} inactive` : 'All active'} href="/inventory/products" />
          <StatCard label="To reorder" value={report.low_stock_products} icon={AlertTriangle} tone="warning" hint="At or below reorder point" href="/inventory/products?filter=low" />
          <StatCard label="Out of stock" value={report.out_of_stock_products} icon={PackageX} tone="danger" hint="Active products with none on hand" href="/inventory/inventory-items?filter=out" />
        </StatGrid>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" icon={AlertTriangle} title="Reorder list" description="Lowest stock first, with a suggested order up to max stock" delay={0.1} bodyClassName="p-0"
          action={<TextLink href="/inventory/products?filter=low">All</TextLink>}>
          {!report ? <div className="p-4"><TableSkeleton rows={4} cols={3} /></div> : report.reorder.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing to reorder. Every product is above its reorder point.</p>
          ) : (
            <AppStagger className="divide-y">
              {report.reorder.slice(0, 6).map((p) => (
                <AppStaggerItem key={p.id}>
                  <Link href={`/inventory/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="shrink-0 text-sm tabular-nums"><span className={cn('font-semibold', p.stock === 0 ? 'text-danger' : 'text-warning')}>{formatCount(p.stock)}</span><span className="text-muted-foreground"> / {formatCount(p.reorder_point)}</span></p>
                      </div>
                      <StockMeter className="mt-2" quantity={p.stock} reorderPoint={p.reorder_point} max={p.max_stock_level} />
                    </div>
                    <span className="hidden shrink-0 rounded-lg bg-brand-soft px-2 py-1 text-xs font-medium text-brand sm:inline">Order {formatCount(p.suggested_order)}</span>
                  </Link>
                </AppStaggerItem>
              ))}
            </AppStagger>
          )}
        </Panel>
        <Panel className="lg:col-span-2" icon={Building2} title="Value by warehouse" delay={0.15} action={<TextLink href="/inventory/warehouses">Warehouses</TextLink>}>
          {!report ? <TableSkeleton rows={3} cols={2} /> : (
            <BarList items={report.by_warehouse.map((w) => ({ label: w.name, sub: `${formatCount(w.units)} units · ${w.lines} lines`, value: toNumber(w.value) }))} format={money0} empty="No stock in any warehouse yet." />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" icon={History} title="Latest movements" delay={0.2} bodyClassName="p-0" action={<TextLink href="/inventory/transactions">History</TextLink>}>
          {!moves ? <div className="p-4"><TableSkeleton rows={4} cols={3} /></div> : <MovementFeed rows={moves} empty="No stock has moved yet. Receive stock to get started." />}
        </Panel>
        <AppStagger className="grid content-start gap-3 lg:col-span-2">
          {([
            ['/inventory/inventory-items', Boxes, 'Stock levels', 'Every product in every warehouse'],
            ['/inventory/categories', FolderTree, 'Categories', 'Group products for reporting'],
            ['/inventory/reports', BarChart3, 'Stock report', 'Valuation and exports'],
          ] as const).map(([href, icon, title, description]) => (
            <AppStaggerItem key={href}><ActionTile href={href} icon={icon} title={title} description={description} /></AppStaggerItem>
          ))}
        </AppStagger>
      </div>
    </div>
  )
}
