// src/components/inventory/status.tsx
// How stock levels and stock movements look, in one place.
'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronLeft, ChevronRight, Factory, RotateCcw, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusPill, toneChip, type Tone } from '@/components/app/kit'
import { MotionRow, ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import { formatCount, formatDateTime, timeAgo } from '@/lib/format'
import type { Movement, MovementType } from '@/services/stockService'

export type StockLevel = 'out' | 'low' | 'ok' | 'over'

export function stockLevel(quantity: number, reorderPoint = 0, max = 0): StockLevel {
  if (quantity <= 0) return 'out'
  if (reorderPoint > 0 && quantity <= reorderPoint) return 'low'
  if (max > 0 && quantity > max) return 'over'
  return 'ok'
}

const LEVEL: Record<StockLevel, { label: string; tone: Tone; bar: string }> = {
  out: { label: 'Out of stock', tone: 'danger', bar: 'bg-danger' },
  low: { label: 'Reorder', tone: 'warning', bar: 'bg-warning' },
  ok: { label: 'In stock', tone: 'success', bar: 'bg-success' },
  over: { label: 'Overstocked', tone: 'info', bar: 'bg-info' },
}

export function StockPill({ quantity, reorderPoint, max }: { quantity: number; reorderPoint?: number; max?: number }) {
  const l = LEVEL[stockLevel(quantity, reorderPoint, max)]
  return <StatusPill tone={l.tone} pulse={l.tone === 'danger'}>{l.label}</StatusPill>
}

/** Quantity as a bar against the larger of max stock and twice the reorder point; a tick marks the reorder point. */
export function StockMeter({ quantity, reorderPoint = 0, max = 0, className }: { quantity: number; reorderPoint?: number; max?: number; className?: string }) {
  const reduce = useReducedMotion()
  const scale = Math.max(max, reorderPoint * 2, quantity, 1)
  const level = stockLevel(quantity, reorderPoint, max)
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)} aria-hidden>
      <motion.div className={cn('h-full rounded-full', LEVEL[level].bar)} initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.min(100, (quantity / scale) * 100)}%` }} transition={{ duration: 0.8, ease }} />
      {reorderPoint > 0 && <span className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${(reorderPoint / scale) * 100}%` }} />}
    </div>
  )
}

export const MOVEMENT: Record<MovementType, { label: string; icon: LucideIcon; tone: Tone }> = {
  RECEIPT: { label: 'Receipt', icon: ArrowDownToLine, tone: 'success' },
  SHIPMENT: { label: 'Shipment', icon: ArrowUpFromLine, tone: 'warning' },
  ADJUSTMENT: { label: 'Adjustment', icon: SlidersHorizontal, tone: 'info' },
  TRANSFER: { label: 'Transfer', icon: ArrowLeftRight, tone: 'brand' },
  RETURN: { label: 'Return', icon: RotateCcw, tone: 'success' },
  PRODUCTION: { label: 'Production', icon: Factory, tone: 'brand' },
}

export function MovementIcon({ type }: { type: MovementType }) {
  const m = MOVEMENT[type] ?? MOVEMENT.ADJUSTMENT
  return <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', toneChip[m.tone])}><m.icon className="h-4 w-4" /></span>
}

export function SignedQty({ value, unit }: { value: number; unit?: string }) {
  return (
    <span className={cn('font-semibold tabular-nums', value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-muted-foreground')}>
      {value > 0 ? '+' : ''}{formatCount(value)}{unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
    </span>
  )
}

/** Compact movement feed for detail pages and the overview. */
export function MovementFeed({ rows, showProduct = true, showWarehouse = true, empty = 'No stock movements yet.' }: {
  rows: Movement[]; showProduct?: boolean; showWarehouse?: boolean; empty?: string
}) {
  if (rows.length === 0) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y">
        {rows.map((m, i) => (
          <MotionRow key={m.id} index={i}>
            <td className="w-12 py-3 pl-4 pr-2 sm:w-14 sm:pl-5"><MovementIcon type={m.transaction_type} /></td>
            <td className="w-full max-w-0 py-3 pr-2">
              <p className="truncate font-medium">{showProduct ? m.product_name : MOVEMENT[m.transaction_type]?.label}</p>
              <p className="truncate text-xs text-muted-foreground" title={formatDateTime(m.timestamp)}>
                {[showProduct && MOVEMENT[m.transaction_type]?.label, showWarehouse && m.warehouse_name, m.reference, timeAgo(m.timestamp)].filter(Boolean).join(' · ')}
              </p>
            </td>
            <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right sm:pr-5">
              <SignedQty value={m.quantity} />
              {m.balance_after != null && <p className="text-xs tabular-nums text-muted-foreground">→ {formatCount(m.balance_after)}</p>}
            </td>
          </MotionRow>
        ))}
      </tbody>
    </table>
  )
}

export function Pager({ page, count, pageSize = 100, onPage }: { page: number; count: number; pageSize?: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(count / pageSize)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{formatCount((page - 1) * pageSize + 1)}–{formatCount(Math.min(page * pageSize, count))} of {formatCount(count)}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-sm font-medium text-brand hover:underline">{children}</Link>
}
