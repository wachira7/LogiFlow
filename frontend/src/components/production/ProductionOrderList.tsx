// src/components/production/ProductionOrderList.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ClipboardList, Edit, Plus, Search, Trash2, X } from 'lucide-react'
import { useProductionOrders } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { formatCount, formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ORDER_STATUS, OrderStatusPill, ProgressBar } from './status'
import type { ProductionOrderStatus } from '@/types/production.types'

const FILTERS: (ProductionOrderStatus | 'ALL')[] = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function ProductionOrderList() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { orders, loading, error, fetchOrders, deleteOrder } = useProductionOrders()

  const initial = params.get('status') as ProductionOrderStatus | null
  const [status, setStatus] = useState<ProductionOrderStatus | 'ALL'>(initial && initial in ORDER_STATUS ? initial : 'ALL')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    fetchOrders({ search: search || undefined, status: status !== 'ALL' ? status : undefined })
      .catch(() => {})
      .finally(() => setLoadedOnce(true))
  }, [search, status, fetchOrders])

  const chooseStatus = (next: ProductionOrderStatus | 'ALL') => {
    setStatus(next)
    router.replace(next === 'ALL' ? pathname : `${pathname}?status=${next}`, { scroll: false })
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteOrder(toDelete)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Couldn’t delete this order.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const list = Array.isArray(orders) ? orders : []
  const filtered = search || status !== 'ALL'
  const open = (id: string) => router.push(`/production/orders/${id}`)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Production orders"
        description="Every production run, from plan to finished goods."
        actions={
          <Button onClick={() => router.push('/production/orders/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="mr-2 h-4 w-4" />New order
          </Button>
        }
      />

      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => {
              const selected = status === f
              return (
                <button key={f} role="tab" aria-selected={selected} onClick={() => chooseStatus(f)}
                  className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
                  {selected && <motion.span layoutId="po-filter" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{f === 'ALL' ? 'All' : ORDER_STATUS[f].label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number, product, notes…" className="bg-card pl-9 pr-9" aria-label="Search orders" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </FadeIn>

      {error && loadedOnce && <ErrorBanner title="Couldn’t load orders" message={error} />}
      {deleteError && <ErrorBanner title="Delete failed" message={deleteError} />}

      {!loadedOnce ? (
        <TableSkeleton rows={6} cols={6} />
      ) : list.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Search />} title="No matching orders" description="Try a different status or search."
            action={<Button variant="outline" onClick={() => { setQuery(''); chooseStatus('ALL') }}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={<ClipboardList />} title="No production orders yet"
            description="A production order turns raw materials into a finished product. Add its steps and materials, start it when you’re ready, and complete it to stock the output."
            action={<Button onClick={() => router.push('/production/orders/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Create order</Button>} />
        )
      ) : (
        <FadeIn delay={0.1} className={cn('overflow-hidden rounded-xl border bg-card shadow-sm transition-opacity', loading && 'opacity-60')}>
          <ul className="divide-y md:hidden">
            {list.map((o) => (
              <li key={o.id}>
                <button onClick={() => open(o.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{o.product_name} <span className="font-normal text-muted-foreground">× {formatCount(o.quantity)}</span></p>
                      <OrderStatusPill status={o.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{o.order_number} · {o.steps_done}/{o.steps_total} steps</p>
                    <ProgressBar value={o.progress_percentage} />
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-44 px-3 py-3 font-medium">Progress</th>
                  <th className="hidden px-3 py-3 font-medium xl:table-cell">Output to</th>
                  <th className="px-3 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((o, i) => (
                  <MotionRow key={o.id} index={i} className="group cursor-pointer transition-colors hover:bg-muted/40" onClick={() => open(o.id)}>
                    <td className="px-5 py-3 font-medium">{o.order_number}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{o.product_name}</p>
                      <p className="text-xs text-muted-foreground">{formatCount(o.quantity)} {o.unit_of_measure || 'units'}</p>
                    </td>
                    <td className="px-3 py-3"><OrderStatusPill status={o.status} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={o.progress_percentage} />
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{o.steps_done}/{o.steps_total}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell">{o.output_warehouse_name || <span className="text-warning">Not set</span>}</td>
                    <td className="px-3 py-3 text-xs">
                      <p>{o.start_date ? formatDay(o.start_date) : 'Not started'}</p>
                      <p className="text-muted-foreground">{o.status === 'COMPLETED' ? `Done ${formatDay(o.end_date)}` : o.end_date ? `Due ${formatDay(o.end_date)}` : 'No target'}</p>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                        {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/production/orders/${o.id}/edit`)} aria-label={`Edit ${o.order_number}`}><Edit className="h-4 w-4" /></Button>
                        )}
                        {(o.status === 'PLANNED' || o.status === 'CANCELLED') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" onClick={() => setToDelete(o.id)} aria-label={`Delete ${o.order_number}`}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
            {list.length === 100 ? 'Showing the 100 most recent; search to narrow it down.' : `${list.length} ${list.length === 1 ? 'order' : 'orders'}`}
          </p>
        </FadeIn>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && !deleting && setToDelete(null)}
        title="Delete production order?"
        description="This removes the order with its steps and materials. Only planned or cancelled orders can be deleted, so no stock is affected."
        confirmText="Delete"
        onConfirm={confirmDelete}
        loading={deleting}
        variant="destructive"
      />
    </div>
  )
}
