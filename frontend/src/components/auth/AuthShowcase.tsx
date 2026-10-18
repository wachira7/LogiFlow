// src/components/auth/AuthShowcase.tsx
// Left panel of the auth pages: brand, an honest pitch and a small live feed of resolved issues.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Logo } from '@/components/landing/Logo'

const feed = [
  { tone: 'bg-danger', title: 'KCD 214T running 25 min late', meta: 'Mombasa Rd · customer notified' },
  { tone: 'bg-warning', title: 'Maize flour 2kg at reorder point', meta: 'Nairobi DC · transfer requested' },
  { tone: 'bg-info', title: 'Order #4821 waiting 2 days', meta: 'Kisumu · assigned to picking' },
  { tone: 'bg-danger', title: 'Delivery failed at stop 4', meta: 'Westlands · rescheduled for 14:00' },
]

const points = [
  'Alerts for late shipments, low stock and stuck orders',
  'Stock across every warehouse, with transfers and history',
  'Routes, drivers and stops from order to doorstep',
  'Pay with M-Pesa, card or crypto',
]

function LiveFeed() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (reduce) return
    // each item: flagged → resolved → next
    const resolveTimer = setTimeout(() => setResolved(true), 1600)
    const nextTimer = setTimeout(() => {
      setResolved(false)
      setIndex((i) => (i + 1) % feed.length)
    }, 3400)
    return () => {
      clearTimeout(resolveTimer)
      clearTimeout(nextTimer)
    }
  }, [index, reduce])

  const item = feed[index]
  return (
    <div className="relative h-[76px]" aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.97 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{item.title}</div>
            <div className="truncate text-xs text-white/60">{item.meta}</div>
          </div>
          <motion.span
            animate={resolved ? { backgroundColor: 'var(--success)', color: '#fff' } : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
            transition={{ duration: 0.3 }}
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
          >
            {resolved ? (
              <>
                <Check className="h-3 w-3" /> Resolved
              </>
            ) : (
              'Needs attention'
            )}
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function AuthShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-[oklch(0.17_0.04_260)] p-12 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-float-slow rounded-full bg-[var(--brand)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-[var(--info)]/15 blur-3xl [animation-delay:-7s]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(70%_60%_at_30%_40%,black,transparent)]" />

      <Link href="/" className="relative z-10 text-white" aria-label="LogiFlow home">
        <Logo />
      </Link>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="animate-fade-up">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            See what&apos;s moving, what&apos;s late, and what to do next.
          </h2>
          <p className="mt-4 text-white/70">
            One workspace for production, warehouses, inventory, dispatch and billing.
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <LiveFeed />
        </div>

        <ul className="space-y-3">
          {points.map((point, i) => (
            <li
              key={point}
              className="animate-fade-up flex items-start gap-3 text-sm text-white/80"
              style={{ animationDelay: `${0.25 + i * 0.08}s` }}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/20">
                <Check className="h-3 w-3 text-[var(--brand)]" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-sm text-white/50">14-day free trial on every plan · Built in Africa, for logistics teams everywhere</p>
    </div>
  )
}
