// src/components/dashboard/Greeting.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Building2, RefreshCw } from 'lucide-react'
import { ease } from '@/components/app/motion'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

export function Greeting({
  firstName, company, summary, updatedAt, refreshing, onRefresh,
}: {
  firstName: string
  company: string
  summary: string
  updatedAt?: string
  refreshing: boolean
  onRefresh: () => void
}) {
  const reduce = useReducedMotion()
  const [now, setNow] = useState<Date | null>(null)
  // Re-render "updated x ago" every 30 s; the clock is client-only to avoid hydration mismatches
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-card to-card p-6 sm:p-8"
    >
      {/* Soft drifting brand glow */}
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 animate-float-slow rounded-full bg-brand/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 animate-float-slow rounded-full bg-info/10 blur-3xl [animation-delay:-6s]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-brand" />{company}
            {now && <span className="hidden sm:inline"> · {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {now ? greeting(now.getHours()) : 'Welcome'}, {firstName}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{summary}</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-full border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground sm:self-auto"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Updating…' : updatedAt && now ? `Updated ${timeAgo(updatedAt)}` : 'Refresh'}
        </button>
      </div>
    </motion.section>
  )
}
