// src/app/(app)/warehousing/reports/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart3, CheckCircle2, Trophy } from 'lucide-react'
import { useTransferItems } from '@/hooks/useWarehousing'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, Panel, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { formatCount, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InsufficientStockItem, PopularTransferProduct } from '@/types/warehousing.types'

type Tab = 'shortages' | 'popular'

const shortageColumns: CsvColumn<InsufficientStockItem>[] = [
  { header: 'Transfer', value: (r) => r.transfer_number },
  { header: 'Product', value: (r) => r.product_name },
  { header: 'SKU', value: (r) => r.product_sku },
  { header: 'Source warehouse', value: (r) => r.source_warehouse },
  { header: 'Required', value: (r) => r.required_quantity },
  { header: 'Available', value: (r) => r.available_stock },
  { header: 'Shortage', value: (r) => r.shortage },
  { header: 'Item value', value: (r) => r.item_value },
]

const popularColumns: CsvColumn<PopularTransferProduct>[] = [
  { header: 'Product', value: (r) => r.product__name },
  { header: 'SKU', value: (r) => r.product__sku },
  { header: 'Transfers', value: (r) => r.transfer_count },
  { header: 'Units moved', value: (r) => r.total_quantity },
]

export default function WarehousingReportsPage() {
  const { insufficientStock, popularTransfers, error, fetchInsufficientStockReport, fetchPopularTransfers } = useTransferItems()
  const [tab, setTab] = useState<Tab>('shortages')
  const [ready, setReady] = useState(false)

  const load = () => Promise.allSettled([fetchInsufficientStockReport(), fetchPopularTransfers()]).finally(() => setReady(true))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shortages = insufficientStock?.insufficient_stock_items ?? []
  const popular = popularTransfers?.popular_transfer_products ?? []
  const topCount = Math.max(1, ...popular.map((p) => p.transfer_count))
  const today = new Date().toISOString().slice(0, 10)

  const tabs: { key: Tab; label: string; count: number; icon: typeof AlertTriangle }[] = [
    { key: 'shortages', label: 'Stock shortages', count: shortages.length, icon: AlertTriangle },
    { key: 'popular', label: 'Most moved', count: popular.length, icon: Trophy },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Warehousing reports"
        description="Spot pending transfers that can’t go out yet and see which products move most."
        actions={
          tab === 'shortages' ? (
            <ExportButton filename={`transfer-shortages-${today}`} rows={shortages} columns={shortageColumns} />
          ) : (
            <ExportButton filename={`most-moved-products-${today}`} rows={popular} columns={popularColumns} />
          )
        }
      />

      {error && ready && <ErrorBanner title="Couldn’t load reports" message={error} onRetry={load} />}

      <FadeIn delay={0.05}>
        <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist">
          {tabs.map((t) => {
            const selected = tab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.key)}
                className={cn('relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}
              >
                {selected && <motion.span layoutId="report-tab" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
                {ready && <span className="relative rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{t.count}</span>}
              </button>
            )
          })}
        </div>
      </FadeIn>

      {!ready ? (
        <TableSkeleton rows={5} cols={5} />
      ) : tab === 'shortages' ? (
        shortages.length === 0 ? (
          <EmptyState icon={<CheckCircle2 />} title="No shortages" description="Every pending transfer has enough stock in its source warehouse to be approved." />
        ) : (
          <div className="space-y-4">
            <FadeIn>
              <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {shortages.length} {shortages.length === 1 ? 'item is' : 'items are'} short · {formatMoney(insufficientStock?.total_shortage_value)} of stock missing
                  </p>
                  <p className="opacity-90">These transfers can’t be approved until the source warehouse is restocked or the quantities are reduced.</p>
                </div>
              </div>
            </FadeIn>
            <Panel bodyClassName="p-0" delay={0.1}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Transfer</th>
                      <th className="px-3 py-3 font-medium">Product</th>
                      <th className="px-3 py-3 font-medium">From</th>
                      <th className="px-3 py-3 text-right font-medium">Need</th>
                      <th className="px-3 py-3 text-right font-medium">Have</th>
                      <th className="px-5 py-3 text-right font-medium">Short by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shortages.map((s, i) => (
                      <MotionRow key={`${s.transfer_number}-${s.product_sku}`} index={i} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3">
                          {s.transfer_id ? (
                            <Link href={`/warehousing/transfers/${s.transfer_id}`} className="font-medium text-brand hover:underline">{s.transfer_number}</Link>
                          ) : (
                            <span className="font-medium">{s.transfer_number}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{s.product_name}</p>
                          <p className="text-xs text-muted-foreground">{s.product_sku}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{s.source_warehouse}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCount(s.required_quantity)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCount(s.available_stock)}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-danger">{formatCount(s.shortage)}</td>
                      </MotionRow>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )
      ) : popular.length === 0 ? (
        <EmptyState icon={<Trophy />} title="No completed transfers yet" description="Products show up here once transfers carrying them are marked received." />
      ) : (
        <Panel icon={Trophy} title="Top 10 most-moved products" description="By number of completed transfers" bodyClassName="p-0" delay={0.1}>
          <ol className="divide-y">
            {popular.map((p, i) => (
              <motion.li
                key={p.product__sku}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-4 px-4 py-3 sm:px-5"
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', i === 0 ? 'bg-brand text-brand-foreground' : i < 3 ? 'bg-brand-soft text-brand' : 'bg-muted text-muted-foreground')}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{p.product__name} <span className="text-xs font-normal text-muted-foreground">{p.product__sku}</span></p>
                    <p className="shrink-0 text-xs text-muted-foreground sm:text-sm">{p.transfer_count} {p.transfer_count === 1 ? 'transfer' : 'transfers'} · {formatCount(p.total_quantity)} units</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full origin-left animate-[grow-x_0.9s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-brand" style={{ width: `${(p.transfer_count / topCount) * 100}%` }} />
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  )
}
