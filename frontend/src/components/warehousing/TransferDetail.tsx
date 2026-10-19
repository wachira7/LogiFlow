// src/components/warehousing/TransferDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowRightLeft, Ban, CheckCircle2, Clock, Edit, Package, PlayCircle, Trash2, Truck, Warehouse, XCircle,
} from 'lucide-react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { FadeIn, ease } from '@/components/app/motion'
import { formatCount, formatDateTime, formatMoney, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TransferStatusPill } from './status'
import type { WarehouseTransferDetail } from '@/types/warehousing.types'

type Action = 'approve' | 'start' | 'complete' | 'cancel' | 'delete'

const STEPS = [
  { key: 'PENDING', label: 'Requested', icon: Clock },
  { key: 'IN_TRANSIT', label: 'In transit', icon: Truck },
  { key: 'COMPLETED', label: 'Received', icon: CheckCircle2 },
] as const

/** Pending → In transit → Received, with the line filling up to the current step. */
function ProgressTracker({ transfer }: { transfer: WarehouseTransferDetail }) {
  const reduce = useReducedMotion()
  if (transfer.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
        <Ban className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p>
          <span className="font-medium">This transfer was cancelled.</span>{' '}
          <span className="text-muted-foreground">Any stock that had left the source warehouse was put back.</span>
        </p>
      </div>
    )
  }
  const current = STEPS.findIndex((s) => s.key === transfer.status)
  return (
    <div className="relative grid grid-cols-3">
      <div className="absolute left-[16.66%] right-[16.66%] top-5 h-0.5 rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.9, ease, delay: 0.2 }}
        />
      </div>
      {STEPS.map((step, i) => {
        const done = i < current || transfer.status === 'COMPLETED'
        const active = i === current && transfer.status !== 'COMPLETED'
        const Icon = step.icon
        return (
          <div key={step.key} className="relative flex flex-col items-center gap-2 text-center">
            <motion.span
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease, delay: 0.15 + i * 0.12 }}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors',
                done && 'border-brand bg-brand text-brand-foreground',
                active && 'border-brand text-brand',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-brand/25 motion-reduce:hidden" />}
              <Icon className="h-4 w-4" />
            </motion.span>
            <span className={cn('text-xs font-medium sm:text-sm', !done && !active && 'text-muted-foreground')}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Source → destination, with a truck travelling the line while stock is on the road. */
function RouteStrip({ transfer }: { transfer: WarehouseTransferDetail }) {
  const reduce = useReducedMotion()
  const moving = transfer.status === 'IN_TRANSIT' && transfer.stock_dispatched !== false
  const arrived = transfer.status === 'COMPLETED'
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
        <p className="flex items-start gap-1.5 font-semibold leading-snug"><Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span className="line-clamp-2 break-words">{transfer.source_warehouse_name}</span></p>
      </div>
      <div className="relative h-8 w-16 shrink-0 sm:w-40">
        <svg className="absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
          <line x1="0" y1="1" x2="100" y2="1" stroke="var(--border)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="1" x2="100" y2="1" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke"
            className={cn(moving && 'animate-dash-flow', !moving && !arrived && 'opacity-30')} />
        </svg>
        <motion.span
          className="absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-md"
          initial={false}
          animate={moving && !reduce ? { left: ['0%', 'calc(100% - 1.75rem)'] } : { left: arrived ? 'calc(100% - 1.75rem)' : '0%' }}
          transition={moving && !reduce ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' } : { duration: 0.6, ease }}
        >
          <Truck className="h-3.5 w-3.5" />
        </motion.span>
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
        <p className="flex items-start justify-end gap-1.5 font-semibold leading-snug"><span className="line-clamp-2 break-words">{transfer.destination_warehouse_name}</span><Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-brand" /></p>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading transfer">
      <div className="flex items-end justify-between">
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-40" /></div>
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function TransferDetail({ transferId }: { transferId: string }) {
  const router = useRouter()
  const {
    currentTransfer, error, fetchTransferById, deleteTransfer, approveTransfer, startTransfer, completeTransfer, cancelTransfer,
  } = useWarehouseTransfers()

  const [initialLoad, setInitialLoad] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<Action | null>(null)

  useEffect(() => {
    fetchTransferById(transferId).catch(() => {}).finally(() => setInitialLoad(false))
  }, [transferId, fetchTransferById])

  if (initialLoad) return <DetailSkeleton />

  if (!currentTransfer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transfer not found" back={{ href: '/warehousing/transfers', label: 'Transfers' }} />
        <ErrorBanner title="Couldn’t load this transfer" message={error || 'It may have been deleted.'} onRetry={() => fetchTransferById(transferId)} />
      </div>
    )
  }

  const transfer = currentTransfer
  const source = transfer.source_warehouse_name ?? 'the source warehouse'
  const destination = transfer.destination_warehouse_name ?? 'the destination warehouse'
  const short = transfer.status === 'PENDING' && !transfer.all_items_sufficient_stock

  const dialogs: Record<Action, { title: string; description: string; confirm: string }> = {
    approve: { title: 'Approve transfer?', description: `Approving takes the stock out of ${source} now and marks the transfer as in transit.`, confirm: 'Approve' },
    start: { title: 'Start transfer?', description: `This transfer was approved before stock moved automatically. Starting it takes the stock out of ${source}.`, confirm: 'Start' },
    complete: { title: 'Mark as received?', description: `Confirm the goods arrived: this adds the stock to ${destination} and completes the transfer.`, confirm: 'Mark received' },
    cancel: {
      title: 'Cancel transfer?',
      description: transfer.stock_dispatched ? `The stock has already left ${source}; cancelling puts it back there.` : 'No stock has moved yet, so nothing changes in your warehouses.',
      confirm: 'Cancel transfer',
    },
    delete: { title: 'Delete transfer?', description: 'This removes the transfer for good. No stock is affected.', confirm: 'Delete' },
  }

  const run = async () => {
    if (!pending) return
    setActionLoading(true)
    setActionError(null)
    try {
      if (pending === 'delete') {
        await deleteTransfer(transferId)
        router.push('/warehousing/transfers')
        return
      }
      await { approve: approveTransfer, start: startTransfer, complete: completeTransfer, cancel: cancelTransfer }[pending](transferId)
      await fetchTransferById(transferId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That didn’t work. Please try again.')
    } finally {
      setActionLoading(false)
      setPending(null)
    }
  }

  const isPending = transfer.status === 'PENDING'
  const legacyApproved = transfer.status === 'IN_TRANSIT' && !transfer.stock_dispatched
  const onRoad = transfer.status === 'IN_TRANSIT' && transfer.stock_dispatched

  const timeline = [
    { label: 'Requested', at: transfer.initiated_at, by: transfer.initiated_by_name },
    transfer.approved_by_name ? { label: 'Approved', at: null, by: transfer.approved_by_name } : null,
    transfer.completed_at ? { label: 'Received', at: transfer.completed_at, by: null } : null,
  ].filter(Boolean) as { label: string; at: string | null; by: string | null }[]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowRightLeft}
        back={{ href: '/warehousing/transfers', label: 'Transfers' }}
        title={transfer.transfer_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TransferStatusPill transfer={transfer} />
            <span>Requested {timeAgo(transfer.initiated_at)}{transfer.initiated_by_name ? ` by ${transfer.initiated_by_name}` : ''}</span>
          </span>
        }
        actions={
          <>
            {isPending && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/warehousing/transfers/${transferId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </Button>
            )}
            {(isPending || transfer.status === 'CANCELLED') && (
              <Button variant="outline" size="sm" onClick={() => setPending('delete')} className="text-danger hover:text-danger">
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </Button>
            )}
            {(isPending || transfer.status === 'IN_TRANSIT') && (
              <Button variant="outline" size="sm" onClick={() => setPending('cancel')}>
                <XCircle className="mr-2 h-4 w-4" />Cancel
              </Button>
            )}
            {isPending && (
              <Button size="sm" onClick={() => setPending('approve')} disabled={short} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
                <CheckCircle2 className="mr-2 h-4 w-4" />Approve &amp; dispatch
              </Button>
            )}
            {legacyApproved && (
              <Button size="sm" onClick={() => setPending('start')} className="bg-brand text-brand-foreground hover:bg-brand/90">
                <PlayCircle className="mr-2 h-4 w-4" />Start transfer
              </Button>
            )}
            {onRoad && (
              <Button size="sm" onClick={() => setPending('complete')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
                <CheckCircle2 className="mr-2 h-4 w-4" />Mark as received
              </Button>
            )}
          </>
        }
      />

      {actionError && <ErrorBanner title="Action failed" message={actionError} />}

      {short && (
        <FadeIn>
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Not enough stock to approve yet</p>
              <p className="opacity-90">Some items need more stock in {source} than it holds. Restock or edit the quantities first.</p>
            </div>
          </div>
        </FadeIn>
      )}

      <Panel delay={0.05} bodyClassName="space-y-6 p-5 sm:p-6">
        <ProgressTracker transfer={transfer} />
        <div className="border-t pt-5"><RouteStrip transfer={transfer} /></div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          icon={Package}
          title={`Items (${transfer.total_items})`}
          description={`${formatCount(transfer.total_quantity)} units in total`}
          bodyClassName="p-0"
          delay={0.12}
        >
          {/* Phones: one card per item */}
          <ul className="divide-y sm:hidden">
            {transfer.transfer_items.map((item) => (
              <li key={item.id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">× {formatCount(item.quantity)}</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className={cn(isPending && !item.sufficient_source_stock && 'font-medium text-danger')}>
                    {isPending ? `${formatCount(item.source_stock_available)} available` : item.source_location || 'No bin set'}
                  </span>
                  <span>{formatMoney(item.item_value)}</span>
                </div>
              </li>
            ))}
          </ul>
          {/* Larger screens: table */}
          <div className="relative hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-3 py-2.5 font-medium">Bins (from → to)</th>
                  {isPending && <th className="px-3 py-2.5 text-right font-medium">Available</th>}
                  <th className="px-5 py-2.5 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfer.transfer_items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.04 }} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCount(item.quantity)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.source_location || '—'} → {item.destination_location || '—'}</td>
                    {isPending && (
                      <td className={cn('px-3 py-3 text-right tabular-nums', !item.sufficient_source_stock && 'font-medium text-danger')}>
                        {formatCount(item.source_stock_available)}
                        {!item.sufficient_source_stock && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right tabular-nums">{formatMoney(item.item_value)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 sm:px-5">
            <span className="text-sm text-muted-foreground">Total value</span>
            <span className="text-lg font-semibold tabular-nums">{formatMoney(transfer.total_value)}</span>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel icon={Clock} title="Timeline" delay={0.18}>
            <ol className="relative space-y-5 border-l pl-5">
              {timeline.map((t) => (
                <li key={t.label} className="relative">
                  <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-card" />
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {[t.at && formatDateTime(t.at), t.by && `by ${t.by}`].filter(Boolean).join(' · ') || '—'}
                  </p>
                </li>
              ))}
            </ol>
            {transfer.transfer_duration_days !== null && (
              <p className="mt-5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Took {transfer.transfer_duration_days} {transfer.transfer_duration_days === 1 ? 'day' : 'days'} end to end.
              </p>
            )}
          </Panel>
          {transfer.notes && (
            <Panel title="Notes" delay={0.22}>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{transfer.notes}</p>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !actionLoading && setPending(null)}
        title={pending ? dialogs[pending].title : ''}
        description={pending ? dialogs[pending].description : ''}
        confirmText={pending ? dialogs[pending].confirm : undefined}
        onConfirm={run}
        loading={actionLoading}
        variant={pending === 'delete' || pending === 'cancel' ? 'destructive' : 'default'}
      />
    </div>
  )
}
