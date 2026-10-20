// src/app/platform-admin/companies/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes, Building2, ClipboardList, Factory, Layers, Package, Receipt, ScrollText, Truck, Users, Warehouse } from 'lucide-react'
import { adminService, type CompanyDetail } from '@/services/adminService'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner, PageHeader, Panel, StatusPill } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { CompanyActions } from '@/components/admin/CompanyActions'
import { formatTotals } from '@/components/billing/shared'
import { formatDay, formatMoney, timeAgo } from '@/lib/format'

const USAGE: [string, string, typeof Package][] = [
  ['products', 'Products', Package], ['warehouses', 'Warehouses', Warehouse], ['orders', 'Orders', ClipboardList],
  ['shipments', 'Shipments', Truck], ['production_orders', 'Production runs', Factory], ['transfers', 'Transfers', Boxes],
]

export default function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [c, setC] = useState<CompanyDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => adminService.company(id).then(setC).catch((err) => setError(err instanceof Error ? err.message : 'Not found')), [id])
  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="space-y-6"><PageHeader title="Company" back={{ href: '/platform-admin/companies', label: 'Companies' }} /><ErrorBanner title="Couldn’t load this company" message={error} /></div>
  if (!c) return <div className="space-y-6"><Skeleton className="h-16 w-80" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>

  const live = c.subscriptions.find((s) => ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(s.status))
  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} back={{ href: '/platform-admin/companies', label: 'Companies' }} title={c.name}
        description={<span className="flex flex-wrap items-center gap-2"><StatusPill tone={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Suspended'}</StatusPill><span>{[c.industry, c.email, `joined ${formatDay(c.created_at)}`].filter(Boolean).join(' · ')}</span></span>}
        actions={<CompanyActions variant="buttons" company={{ company_id: c.id, company_name: c.name, is_active: c.is_active }} onDone={(a) => (a === 'DELETE' ? router.push('/platform-admin/companies') : load())} />} />

      <AppStagger className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {USAGE.map(([k, label, Icon]) => (
          <AppStaggerItem key={k}>
            <div className="rounded-xl border bg-card p-3 text-center"><Icon className="mx-auto h-4 w-4 text-brand" /><p className="mt-1 text-xl font-semibold tabular-nums">{c.usage[k] ?? 0}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </AppStaggerItem>
        ))}
      </AppStagger>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={Layers} title="Subscription" description={live ? `${live.plan} · ${live.provider.toLowerCase()} · ${live.status.toLowerCase()}` : 'No live plan'} delay={0.1} bodyClassName="p-0">
          {c.subscriptions.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">Never subscribed.</p> : (
            <ul className="divide-y">
              {c.subscriptions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span><span className="font-medium">{s.plan}</span> <span className="text-muted-foreground">({s.cycle.toLowerCase()}, {s.provider === 'STRIPE' ? 'card' : s.provider.toLowerCase()})</span><span className="block text-xs text-muted-foreground">{formatDay(s.start_date)} – {formatDay(s.end_date)}{s.is_trial ? ' · trial' : ''}{!s.auto_renew ? ' · won’t renew' : ''}</span></span>
                  <StatusPill tone={s.status === 'ACTIVE' ? 'success' : s.status === 'TRIALING' ? 'info' : s.status === 'PAST_DUE' ? 'warning' : 'neutral'}>{s.status.toLowerCase().replace('_', ' ')}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel icon={Receipt} title="Payments" description={`Paid in total: ${formatTotals(c.paid_total)}`} delay={0.12} bodyClassName="p-0">
          {c.payments.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">No payments.</p> : (
            <ul className="divide-y">
              {c.payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate">{p.description || p.provider}</span><span className="text-xs text-muted-foreground">{formatDay(p.created_at)}</span></span>
                  <span className="flex items-center gap-2"><StatusPill tone={p.status === 'COMPLETED' ? 'success' : p.status === 'PENDING' ? 'warning' : 'danger'}>{p.status.toLowerCase()}</StatusPill><span className="w-24 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={Users} title={`People (${c.users.length})`} bodyClassName="p-0" delay={0.15}>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody className="divide-y">
              {c.users.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-60'}>
                  <td className="px-5 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">{u.role.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-3 text-muted-foreground">{u.last_login ? `Signed in ${timeAgo(u.last_login)}` : 'Never signed in'}</td>
                  <td className="px-5 py-3 text-right"><StatusPill tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Deactivated'}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel icon={ScrollText} title="Admin history" bodyClassName="p-0" delay={0.2}>
        {c.admin_history.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">No admin actions on this company.</p> : (
          <ul className="divide-y">{c.admin_history.map((a, i) => <li key={i} className="px-5 py-3 text-sm"><p>{a.description}</p><p className="text-xs text-muted-foreground">{a.admin} · {timeAgo(a.timestamp)}</p></li>)}</ul>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground">Region: {c.currency} · {c.timezone}{c.phone ? ` · ${c.phone}` : ''}</p>
    </div>
  )
}
