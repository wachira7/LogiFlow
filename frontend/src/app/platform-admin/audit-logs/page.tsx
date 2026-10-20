// src/app/platform-admin/audit-logs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { adminService, type AuditEntry } from '@/services/adminService'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton, type Tone } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { formatDateTime } from '@/lib/format'

const ACTIONS: Record<string, [string, Tone]> = {
  COMPANY_SUSPENDED: ['Suspended', 'danger'], COMPANY_ACTIVATED: ['Activated', 'success'], COMPANY_DELETED: ['Deleted', 'danger'],
  TRIAL_EXTENDED: ['Trial extended', 'info'], SETTINGS_CHANGED: ['Settings', 'neutral'], NOTIFICATION_PUBLISHED: ['Notification', 'brand'],
  SUBSCRIPTION_MODIFIED: ['Subscription', 'info'], COMPANY_CREATED: ['Company created', 'success'], USER_IMPERSONATED: ['Impersonated', 'warning'],
  SYSTEM_MAINTENANCE: ['Maintenance', 'warning'],
}
const columns: CsvColumn<AuditEntry>[] = [
  { header: 'When', value: (a) => a.created_at }, { header: 'Admin', value: (a) => a.admin_user_email },
  { header: 'Action', value: (a) => a.action }, { header: 'Company', value: (a) => a.target_company_name },
  { header: 'Description', value: (a) => a.description }, { header: 'IP', value: (a) => a.ip_address },
]

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => {
    adminService.auditLogs({ ...(search ? { search } : {}), ...(action !== 'all' ? { action } : {}) }).then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load the audit log.'))
  }, [search, action])

  return (
    <div className="space-y-6">
      <PageHeader icon={ScrollText} title="Audit log" description="Every action taken by a platform admin, with who, when and why."
        actions={<ExportButton filename={`admin-audit-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={columns} />} />
      <FadeIn delay={0.05} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description, admin or company…" className="bg-card pl-9" aria-label="Search audit log" />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full bg-card sm:w-52" aria-label="Filter by action"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All actions</SelectItem>{Object.entries(ACTIONS).map(([k, [l]]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </FadeIn>
      {error && <ErrorBanner title="Couldn’t load the audit log" message={error} />}
      {!rows ? <TableSkeleton rows={6} cols={4} /> : rows.length === 0 ? <EmptyState icon={<ScrollText />} title="Nothing logged" description="Admin actions appear here." /> : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">When</th><th className="px-3 py-3 font-medium">Action</th><th className="px-3 py-3 font-medium">What happened</th><th className="px-5 py-3 font-medium">Admin</th></tr></thead>
              <tbody className="divide-y">
                {rows.map((a, i) => {
                  const [label, tone] = ACTIONS[a.action] ?? [a.action, 'neutral' as Tone]
                  return (
                    <MotionRow key={a.id} index={i} className="align-top transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{formatDateTime(a.created_at)}</td>
                      <td className="px-3 py-3"><StatusPill tone={tone}>{label}</StatusPill></td>
                      <td className="px-3 py-3">{a.description}{a.target_company_name && <span className="block text-xs text-muted-foreground">{a.target_company_name}</span>}</td>
                      <td className="px-5 py-3 text-muted-foreground">{a.admin_user_email}<span className="block text-xs">{a.ip_address}</span></td>
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
