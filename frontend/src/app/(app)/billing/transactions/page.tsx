// src/app/(app)/billing/transactions/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ExternalLink, Receipt } from 'lucide-react'
import { billingService } from '@/services/billingService'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { PROVIDER, TX_STATUS } from '@/components/billing/shared'
import { formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Transaction, TransactionStatus } from '@/types/billing.types'

const FILTERS: (TransactionStatus | 'ALL')[] = ['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED']
const columns: CsvColumn<Transaction>[] = [
  { header: 'Date', value: (t) => t.created_at },
  { header: 'Description', value: (t) => (t.plan_name ? `${t.plan_name} subscription` : t.description) },
  { header: 'Method', value: (t) => t.provider_payment_method || PROVIDER[t.provider].label },
  { header: 'Status', value: (t) => TX_STATUS[t.status].label },
  { header: 'Amount', value: (t) => t.amount },
  { header: 'Currency', value: (t) => t.currency },
  { header: 'Reference', value: (t) => t.invoice_number || t.provider_transaction_id },
]

function TransactionsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const initial = params.get('status') as TransactionStatus | null
  const [status, setStatus] = useState<TransactionStatus | 'ALL'>(initial && initial in TX_STATUS ? initial : 'ALL')
  const [rows, setRows] = useState<Transaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    billingService.transactions(status === 'ALL' ? {} : { status }).then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load payments.'))
  }, [status])

  const choose = (s: TransactionStatus | 'ALL') => {
    setStatus(s)
    router.replace(s === 'ALL' ? pathname : `${pathname}?status=${s}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Receipt} back={{ href: '/billing', label: 'Billing' }} title="Payments" description="Every payment and its receipt."
        actions={<ExportButton filename={`logiflow-payments-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={columns} />} />
      <FadeIn className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={status === f} onClick={() => choose(f)}
              className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', status === f ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
              {status === f && <motion.span layoutId="tx-filter" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{f === 'ALL' ? 'All' : TX_STATUS[f].label}</span>
            </button>
          ))}
        </div>
      </FadeIn>
      {error && <ErrorBanner title="Couldn’t load payments" message={error} />}
      {!rows ? (
        <TableSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Receipt />} title={status === 'ALL' ? 'No payments yet' : 'Nothing here'} description={status === 'ALL' ? 'Payments show up here once you pay for a plan.' : 'Try another filter.'} />
      ) : (
        <FadeIn delay={0.05} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Description</th><th className="px-3 py-3 font-medium">Method</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Amount</th><th className="px-5 py-3"><span className="sr-only">Receipt</span></th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((t, i) => {
                  const P = PROVIDER[t.provider]
                  return (
                    <MotionRow key={t.id} index={i} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-5 py-3">{formatDateTime(t.created_at)}</td>
                      <td className="px-3 py-3"><p className="font-medium">{t.plan_name ? `${t.plan_name} subscription` : t.description || 'Payment'}</p>{t.invoice_number && <p className="text-xs text-muted-foreground">{t.invoice_number}</p>}</td>
                      <td className="px-3 py-3 text-muted-foreground"><P.icon className="mr-1 inline h-3.5 w-3.5" />{t.provider_payment_method || P.label}</td>
                      <td className="px-3 py-3"><StatusPill tone={TX_STATUS[t.status].tone}>{TX_STATUS[t.status].label}</StatusPill></td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                      <td className="px-5 py-3 text-right">{t.receipt_url?.startsWith('http') && <a href={t.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">Receipt <ExternalLink className="h-3 w-3" /></a>}</td>
                    </MotionRow>
                  )
                })}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  return <Suspense fallback={<TableSkeleton rows={5} cols={5} />}><TransactionsContent /></Suspense>
}
