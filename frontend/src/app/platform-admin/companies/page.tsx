// src/app/platform-admin/companies/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, Search, X } from 'lucide-react'
import { adminService, type CompanyRow } from '@/services/adminService'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton, type Tone } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { CompanyActions } from '@/components/admin/CompanyActions'
import { formatDay, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const FILTERS = [
  ['', 'All'], ['active_plan', 'Paying'], ['trialing', 'On trial'], ['past_due', 'Payment due'], ['none', 'No plan'], ['suspended', 'Suspended'],
] as const
const PLAN_TONE: Record<string, Tone> = { ACTIVE: 'success', TRIALING: 'info', PAST_DUE: 'warning', NONE: 'neutral' }
const PLAN_LABEL: Record<string, string> = { ACTIVE: 'Paying', TRIALING: 'Trial', PAST_DUE: 'Payment due', NONE: 'No plan' }

function CompaniesContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<CompanyRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(() => adminService.companies(search, status).then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load companies.')), [search, status])
  useEffect(() => {
    load()
  }, [load])

  const choose = (s: string) => {
    setStatus(s)
    router.replace(s ? `${pathname}?status=${s}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="Companies" description={rows ? `${rows.length} ${rows.length === 1 ? 'company' : 'companies'}${status ? ' in this view' : ''}` : 'Every company on LogiFlow.'} />
      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist">
            {FILTERS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={status === key} onClick={() => choose(key)}
                className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', status === key ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
                {status === key && <motion.span layoutId="co-filter" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Company, email or a user’s email…" className="bg-card pl-9 pr-9" aria-label="Search companies" />
          {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </FadeIn>

      {error && <ErrorBanner title="Couldn’t load companies" message={error} onRetry={load} />}
      {!rows ? <TableSkeleton rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No companies here" description={search || status ? 'Try another search or filter.' : 'Companies appear when people sign up.'} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Company</th><th className="px-3 py-3 font-medium">Plan</th><th className="px-3 py-3 text-right font-medium">People</th><th className="px-3 py-3 font-medium">Last active</th><th className="px-3 py-3 font-medium">Joined</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((c, i) => (
                  <MotionRow key={c.company_id} index={i} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/platform-admin/companies/${c.company_id}`)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-semibold text-brand">{c.company_name.slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-medium">{c.company_name}{!c.is_active && <StatusPill tone="danger">Suspended</StatusPill>}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.owner_email ?? c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><StatusPill tone={PLAN_TONE[c.subscription_status] ?? 'neutral'}>{c.plan_name ? `${c.plan_name} · ${PLAN_LABEL[c.subscription_status] ?? c.subscription_status}` : 'No plan'}</StatusPill></td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.user_count}</td>
                    <td className="px-3 py-3 text-muted-foreground">{timeAgo(c.last_activity)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDay(c.created_at)}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}><CompanyActions company={c} onDone={load} /></td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
    </div>
  )
}

export default function CompaniesPage() {
  return <Suspense fallback={<TableSkeleton rows={6} cols={5} />}><CompaniesContent /></Suspense>
}
