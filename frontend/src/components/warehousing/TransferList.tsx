// src/components/warehousing/TransferList.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowRightLeft, Edit, Eye, Plus, Search, Trash2, X } from 'lucide-react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { formatCount, formatDay, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TRANSFER_STATUS, TransferStatusPill } from './status'
import type { TransferStatus } from '@/types/warehousing.types'

const FILTERS: (TransferStatus | 'ALL')[] = ['ALL', 'PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']

export function TransferList() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { transfers, loading, error, fetchTransfers, deleteTransfer } = useWarehouseTransfers()

  const initialStatus = params.get('status') as TransferStatus | null
  const [status, setStatus] = useState<TransferStatus | 'ALL'>(initialStatus && initialStatus in TRANSFER_STATUS ? initialStatus : 'ALL')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    fetchTransfers({ search: search || undefined, status: status !== 'ALL' ? status : undefined })
      .catch(() => {})
      .finally(() => setLoadedOnce(true))
  }, [search, status, fetchTransfers])

  const chooseStatus = (next: TransferStatus | 'ALL') => {
    setStatus(next)
    router.replace(next === 'ALL' ? pathname : `${pathname}?status=${next}`, { scroll: false })
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTransfer(toDelete)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Couldn’t delete this transfer.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const list = Array.isArray(transfers) ? transfers : []
  const filtered = search || status !== 'ALL'
  const open = (id: string) => router.push(`/warehousing/transfers/${id}`)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowRightLeft}
        title="Transfers"
        description="Every stock move between your warehouses."
        actions={
          <Button onClick={() => router.push('/warehousing/transfers/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="mr-2 h-4 w-4" />New transfer
          </Button>
        }
      />

      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => {
              const selected = status === f
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => chooseStatus(f)}
                  className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}
                >
                  {selected && <motion.span layoutId="transfer-filter" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{f === 'ALL' ? 'All' : TRANSFER_STATUS[f].label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number or notes…" className="bg-card pl-9 pr-9" aria-label="Search transfers" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </FadeIn>

      {error && loadedOnce && <ErrorBanner title="Couldn’t load transfers" message={error} />}
      {deleteError && <ErrorBanner title="Delete failed" message={deleteError} />}

      {!loadedOnce ? (
        <TableSkeleton rows={6} cols={6} />
      ) : list.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Search />}
            title="No matching transfers"
            description="Try a different status or search."
            action={<Button variant="outline" onClick={() => { setQuery(''); chooseStatus('ALL') }}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={<ArrowRightLeft />}
            title="No transfers yet"
            description="Create a transfer to move stock from one warehouse to another. Stock leaves the source when you approve it and arrives when you mark it received."
            action={<Button onClick={() => router.push('/warehousing/transfers/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Create transfer</Button>}
          />
        )
      ) : (
        <FadeIn delay={0.1} className={cn('overflow-hidden rounded-xl border bg-card shadow-sm transition-opacity', loading && 'opacity-60')}>
          {/* Phones */}
          <ul className="divide-y md:hidden">
            {list.map((t) => (
              <li key={t.id}>
                <button onClick={() => open(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{t.transfer_number}</p>
                      <TransferStatusPill transfer={t} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{t.source_warehouse_name} → {t.destination_warehouse_name}</p>
                    <p className="text-xs text-muted-foreground">{formatCount(t.total_quantity)} units · {formatMoney(t.total_value)} · {formatDay(t.initiated_at)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          {/* Tablets and up */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Transfer</th>
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Units</th>
                  <th className="px-3 py-3 text-right font-medium">Value</th>
                  <th className="hidden px-3 py-3 font-medium xl:table-cell">Requested</th>
                  <th className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((t, i) => (
                  <MotionRow key={t.id} index={i} className="group cursor-pointer transition-colors hover:bg-muted/40" onClick={() => open(t.id)}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{t.transfer_number}</p>
                      <p className="text-xs text-muted-foreground">{t.total_items} {t.total_items === 1 ? 'product' : 'products'}</p>
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <p className="truncate">{t.source_warehouse_name} <span className="text-muted-foreground">→</span> {t.destination_warehouse_name}</p>
                    </td>
                    <td className="px-3 py-3"><TransferStatusPill transfer={t} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCount(t.total_quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatMoney(t.total_value)}</td>
                    <td className="hidden px-3 py-3 xl:table-cell">
                      <p>{formatDay(t.initiated_at)}</p>
                      <p className="text-xs text-muted-foreground">{t.initiated_by_name}</p>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(t.id)} aria-label={`View ${t.transfer_number}`}><Eye className="h-4 w-4" /></Button>
                        {t.status === 'PENDING' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/warehousing/transfers/${t.id}/edit`)} aria-label={`Edit ${t.transfer_number}`}><Edit className="h-4 w-4" /></Button>
                        )}
                        {(t.status === 'PENDING' || t.status === 'CANCELLED') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" onClick={() => setToDelete(t.id)} aria-label={`Delete ${t.transfer_number}`}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
            {list.length === 100 ? 'Showing the 100 most recent; search to narrow it down.' : `${list.length} ${list.length === 1 ? 'transfer' : 'transfers'}`}
          </p>
        </FadeIn>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && !deleting && setToDelete(null)}
        title="Delete transfer?"
        description="This removes the transfer for good. Only pending or cancelled transfers can be deleted, so no stock is affected."
        confirmText="Delete"
        onConfirm={confirmDelete}
        loading={deleting}
        variant="destructive"
      />
    </div>
  )
}
