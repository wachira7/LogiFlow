// src/app/(app)/inventory/reports/page.tsx
// Stock snapshot: valuation by warehouse and category, the reorder list, and CSV exports.
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BarChart3, Boxes, Building2, Download, FileSpreadsheet, FolderTree, Loader2, PackageX, TrendingUp, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { stockService, type StockLine, type StockReport } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { ExportButton, downloadCsv, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { MotionRow } from '@/components/app/motion'
import { BarList, Donut } from '@/components/analytics/Charts'
import { StockMeter } from '@/components/inventory/status'
import { formatCount, formatMoney, toNumber } from '@/lib/format'

const money0 = (n: number) => formatMoney(n, undefined, { maximumFractionDigits: 0 })
const today = () => new Date().toISOString().slice(0, 10)
type Reorder = StockReport['reorder'][number]
const reorderCsv: CsvColumn<Reorder>[] = [
  { header: 'SKU', value: (r) => r.sku }, { header: 'Product', value: (r) => r.name }, { header: 'On hand', value: (r) => r.stock },
  { header: 'Reorder point', value: (r) => r.reorder_point }, { header: 'Max stock', value: (r) => r.max_stock_level || '' }, { header: 'Suggested order', value: (r) => r.suggested_order }, { header: 'Unit', value: (r) => r.unit_of_measure },
]
const valuationCsv: CsvColumn<StockLine>[] = [
  { header: 'Warehouse', value: (l) => l.warehouse_name }, { header: 'SKU', value: (l) => l.product_sku }, { header: 'Product', value: (l) => l.product_name },
  { header: 'Bin', value: (l) => l.location }, { header: 'Quantity', value: (l) => l.quantity }, { header: 'Unit', value: (l) => l.unit_of_measure },
  { header: 'Unit cost', value: (l) => l.product_cost_price }, { header: 'Value at cost', value: (l) => l.stock_value }, { header: 'Unit price', value: (l) => l.product_unit_price },
]

export default function StockReportPage() {
  const [report, setReport] = useState<StockReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(() => {
    setError(null)
    stockService.report().then(setReport).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t build the report.'))
  }, [])
  useEffect(() => { load() }, [load])

  // Every stock line, page by page, for the valuation sheet
  const exportValuation = async () => {
    setExporting(true)
    try {
      const rows: StockLine[] = []
      for (let page = 1; ; page++) {
        const r = await stockService.lines({ page, ordering: undefined })
        rows.push(...r.results)
        if (!r.next) break
      }
      rows.sort((a, b) => a.warehouse_name.localeCompare(b.warehouse_name) || a.product_name.localeCompare(b.product_name))
      downloadCsv(`stock-valuation-${today()}`, rows, valuationCsv)
      toast.success(`Exported ${formatCount(rows.length)} stock lines`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Export failed.') }
    finally { setExporting(false) }
  }

  const value = toNumber(report?.total_stock_value)
  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Stock report" description={`Snapshot of what you hold right now, valued at cost in your currency.`}
        actions={<>
          <Button variant="outline" asChild><Link href="/analytics/inventory"><TrendingUp className="mr-2 h-4 w-4" />Trends</Link></Button>
          <Button onClick={exportValuation} disabled={exporting || !report?.total_units} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Valuation CSV</Button>
        </>} />

      {error && <ErrorBanner title="Couldn’t build the report" message={error} onRetry={load} />}
      {!report ? <StatGridSkeleton count={4} /> : (
        <StatGrid>
          <StatCard label="Stock value" value={value} icon={Wallet} tone="brand" format={money0} hint={`${formatCount(report.total_units)} units`} />
          <StatCard label="Active products" value={report.active_products} icon={Boxes} tone="info" hint={`${report.inactive_products} inactive`} />
          <StatCard label="To reorder" value={report.low_stock_products} icon={AlertTriangle} tone="warning" hint={`${Math.round((report.low_stock_products / Math.max(report.active_products, 1)) * 100)}% of active products`} />
          <StatCard label="Out of stock" value={report.out_of_stock_products} icon={PackageX} tone="danger" hint="None on hand anywhere" />
        </StatGrid>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={Building2} title="Value by warehouse" delay={0.1}
          action={report && <ExportButton filename={`value-by-warehouse-${today()}`} rows={report.by_warehouse} label="CSV"
            columns={[{ header: 'Warehouse', value: (w) => w.name }, { header: 'Stock lines', value: (w) => w.lines }, { header: 'Units', value: (w) => w.units }, { header: 'Value', value: (w) => w.value }]} />}>
          {!report ? <TableSkeleton rows={3} cols={2} /> : (
            <BarList items={report.by_warehouse.map((w) => ({ label: w.name, sub: `${formatCount(w.units)} units · ${value ? Math.round((toNumber(w.value) / value) * 100) : 0}%`, value: toNumber(w.value) }))} format={money0} empty="No stock yet." />
          )}
        </Panel>
        <Panel icon={FolderTree} title="Value by category" delay={0.15}
          action={report && <ExportButton filename={`value-by-category-${today()}`} rows={report.by_category} label="CSV"
            columns={[{ header: 'Category', value: (c) => c.name }, { header: 'Units', value: (c) => c.units }, { header: 'Value', value: (c) => c.value }]} />}>
          {!report ? <TableSkeleton rows={3} cols={2} /> : report.by_category.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No stock yet.</p> : (
            <Donut data={report.by_category.map((c) => ({ label: c.name, value: Math.round(toNumber(c.value)) }))} center="at cost" />
          )}
        </Panel>
      </div>

      <Panel icon={AlertTriangle} title="Reorder list" description="Suggested order brings each product back to max stock (or twice its reorder point)" bodyClassName="p-0" delay={0.2}
        action={report && <ExportButton filename={`reorder-list-${today()}`} rows={report.reorder} columns={reorderCsv} label="Purchase list" />}>
        {!report ? <div className="p-4"><TableSkeleton rows={4} cols={4} /></div> : report.reorder.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing to reorder. Every product with a reorder point is above it.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2.5 font-medium sm:px-5">Product</th><th className="w-56 px-3 py-2.5 font-medium">On hand / reorder point</th><th className="px-4 py-2.5 text-right font-medium sm:px-5">Order</th></tr>
              </thead>
              <tbody className="divide-y">
                {report.reorder.map((r, i) => (
                  <MotionRow key={r.id} index={i}>
                    <td className="px-4 py-3 sm:px-5"><Link href={`/inventory/products/${r.id}`} className="font-medium hover:underline">{r.name}</Link><p className="font-mono text-xs text-muted-foreground">{r.sku}</p></td>
                    <td className="px-3 py-3"><p className="tabular-nums"><span className={r.stock === 0 ? 'font-semibold text-danger' : 'font-semibold text-warning'}>{formatCount(r.stock)}</span><span className="text-muted-foreground"> / {formatCount(r.reorder_point)} {r.unit_of_measure}</span></p>
                      <StockMeter className="mt-1.5" quantity={r.stock} reorderPoint={r.reorder_point} max={r.max_stock_level} /></td>
                    <td className="px-4 py-3 text-right sm:px-5"><span className="rounded-lg bg-brand-soft px-2 py-1 text-xs font-semibold tabular-nums text-brand">{formatCount(r.suggested_order)}</span></td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />Exports open in Excel or Google Sheets. Values use each product’s current cost.</p>
    </div>
  )
}
