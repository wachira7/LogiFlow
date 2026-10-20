// src/components/production/status.tsx
// How production order and step statuses look and read, in one place.
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { StatusPill, type Tone } from '@/components/app/kit'
import { ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import type { ProductionOrderStatus, ProductionStepStatus } from '@/types/production.types'

export const ORDER_STATUS: Record<ProductionOrderStatus, { label: string; tone: Tone }> = {
  PLANNED: { label: 'Planned', tone: 'warning' },
  IN_PROGRESS: { label: 'In production', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
}

export const STEP_STATUS: Record<ProductionStepStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Up next', tone: 'neutral' },
  IN_PROGRESS: { label: 'Working', tone: 'info' },
  COMPLETED: { label: 'Done', tone: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'warning' },
}

export function OrderStatusPill({ status }: { status: ProductionOrderStatus }) {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.PLANNED
  return <StatusPill tone={s.tone} pulse={status === 'IN_PROGRESS'}>{s.label}</StatusPill>
}

export function StepStatusPill({ status }: { status: ProductionStepStatus }) {
  const s = STEP_STATUS[status] ?? STEP_STATUS.PENDING
  return <StatusPill tone={s.tone} pulse={status === 'IN_PROGRESS'}>{s.label}</StatusPill>
}

/** Circular progress that fills on mount. */
export function ProgressRing({ value, size = 56, stroke = 6, className, label = true }: { value: number; size?: number; stroke?: number; className?: string; label?: boolean }) {
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1, ease, delay: 0.15 }}
        />
      </svg>
      {label && <span className="absolute text-xs font-semibold tabular-nums">{Math.round(pct)}%</span>}
    </span>
  )
}

/** Thin progress bar that grows on mount. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <span className="block h-full origin-left animate-[grow-x_0.9s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </span>
  )
}
