// src/components/distribution/status.tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, ClipboardList, Hand, Package, PackageCheck, Truck } from 'lucide-react'
import { StatusPill, type Tone } from '@/components/app/kit'
import { ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import type { OrderStatus, RouteStatus, ShipmentStatus, StopStatus } from '@/types/distribution.types'

export const ORDER: Record<OrderStatus, [string, Tone]> = {
  NEW: ['New', 'warning'], PROCESSING: ['Processing', 'info'], SHIPPED: ['Shipped', 'brand'], DELIVERED: ['Delivered', 'success'], CANCELLED: ['Cancelled', 'neutral'],
}
export const SHIPMENT: Record<ShipmentStatus, [string, Tone]> = {
  PENDING: ['Waiting', 'warning'], PICKED: ['Picked', 'info'], PACKED: ['Packed', 'info'], SHIPPED: ['On the way', 'brand'],
  DELIVERED: ['Delivered', 'success'], FAILED: ['Failed', 'danger'], RETURNED: ['Returned', 'neutral'], CANCELLED: ['Cancelled', 'neutral'],
}
export const ROUTE: Record<RouteStatus, [string, Tone]> = {
  PLANNED: ['Planned', 'warning'], IN_PROGRESS: ['On the road', 'brand'], COMPLETED: ['Completed', 'success'], CANCELLED: ['Cancelled', 'neutral'],
}
export const STOP: Record<StopStatus, [string, Tone]> = {
  PENDING: ['Up next', 'neutral'], ARRIVED: ['Arrived', 'info'], COMPLETED: ['Delivered', 'success'], FAILED: ['Failed', 'danger'],
}

export const OrderPill = ({ status }: { status: OrderStatus }) => <StatusPill tone={ORDER[status][1]}>{ORDER[status][0]}</StatusPill>
export const ShipmentPill = ({ status, delayed }: { status: ShipmentStatus; delayed?: boolean }) =>
  delayed ? <StatusPill tone="danger" pulse>Late</StatusPill> : <StatusPill tone={SHIPMENT[status][1]} pulse={status === 'SHIPPED'}>{SHIPMENT[status][0]}</StatusPill>
export const RoutePill = ({ status }: { status: RouteStatus }) => <StatusPill tone={ROUTE[status][1]} pulse={status === 'IN_PROGRESS'}>{ROUTE[status][0]}</StatusPill>
export const StopPill = ({ status }: { status: StopStatus }) => <StatusPill tone={STOP[status][1]}>{STOP[status][0]}</StatusPill>

const STEPS: { key: ShipmentStatus; label: string; icon: typeof Package }[] = [
  { key: 'PENDING', label: 'Created', icon: ClipboardList },
  { key: 'PICKED', label: 'Picked', icon: Hand },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'On the way', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
]

/** Created → Picked → Packed → On the way → Delivered, with the line filling to the current step. */
export function ShipmentProgress({ status }: { status: ShipmentStatus }) {
  const reduce = useReducedMotion()
  const idx = STEPS.findIndex((s) => s.key === status)
  const current = idx === -1 ? (status === 'RETURNED' || status === 'FAILED' ? 3 : 0) : idx
  return (
    <div className="relative grid grid-cols-5">
      <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-border">
        <motion.div className="h-full bg-brand" initial={reduce ? false : { width: 0 }} animate={{ width: `${(current / 4) * 100}%` }} transition={{ duration: 0.9, ease, delay: 0.15 }} />
      </div>
      {STEPS.map((s, i) => {
        const done = i < current || status === 'DELIVERED'
        const active = i === current && status !== 'DELIVERED'
        const Icon = done ? Check : s.icon
        return (
          <div key={s.key} className="relative flex flex-col items-center gap-1.5 text-center">
            <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease, delay: 0.1 + i * 0.08 }}
              className={cn('relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card', done && 'border-brand bg-brand text-brand-foreground', active && 'border-brand text-brand', !done && !active && 'text-muted-foreground')}>
              {active && status === 'SHIPPED' && <span className="absolute inset-0 animate-ping rounded-full bg-brand/25 motion-reduce:hidden" />}
              <Icon className="h-4 w-4" />
            </motion.span>
            <span className={cn('text-[11px] font-medium sm:text-xs', !done && !active && 'text-muted-foreground')}>{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}
