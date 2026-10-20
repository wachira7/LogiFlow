// src/components/inventory/UtilizationRing.tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ease } from '@/components/app/motion'

/** How full a warehouse is (units on hand / capacity). Shows a dash when no capacity is set. */
export function UtilizationRing({ value, size = 52 }: { value: number | null | undefined; size?: number }) {
  const reduce = useReducedMotion()
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const pct = value == null ? 0 : Math.min(value, 100)
  const color = value == null ? 'var(--muted-foreground)' : value >= 95 ? 'var(--danger)' : value >= 80 ? 'var(--warning)' : 'var(--brand)'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={value == null ? 'Set a capacity to track how full it is' : `${value}% full`}
      role="img" aria-label={value == null ? 'No capacity set' : `${value}% full`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={5} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }} transition={{ duration: 0.9, ease }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums">{value == null ? '—' : `${Math.round(value)}%`}</span>
    </div>
  )
}
