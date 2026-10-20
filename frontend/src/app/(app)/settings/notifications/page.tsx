// src/app/(app)/settings/notifications/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Loader2, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ErrorBanner, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import type { NotificationPreferences } from '@/types/settings.types'

const EMAIL: [keyof NotificationPreferences, string, string][] = [
  ['email_order_updates', 'Orders', 'When an order is created, shipped or delivered'],
  ['email_shipment_updates', 'Shipments', 'Delays and delivery confirmations'],
  ['email_inventory_alerts', 'Low stock', 'When a product drops to its reorder point'],
  ['email_payment_confirmations', 'Payments & receipts', 'Receipts and failed payments'],
  ['email_team_invitations', 'Team', 'When someone joins or is invited'],
  ['email_system_updates', 'Product news', 'New features and tips, now and then'],
]
const LATER: [string, string][] = [['Text messages (SMS)', 'Critical alerts and delivery updates by SMS'], ['Push notifications', 'Alerts on your phone and browser']]

export default function NotificationSettingsPage() {
  const [saved, setSaved] = useState<NotificationPreferences | null>(null)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<NotificationPreferences>('/api/v1/auth/notification-preferences/').then((res) => {
      if (res.success && res.data) { setSaved(res.data); setPrefs(res.data) } else setError(res.error || 'Couldn’t load your preferences.')
    })
  }, [])

  const dirty = useMemo(() => !!saved && !!prefs && EMAIL.some(([k]) => saved[k] !== prefs[k]), [saved, prefs])

  const save = async () => {
    if (!prefs) return
    setSaving(true)
    const res = await api.patch<NotificationPreferences>('/api/v1/auth/notification-preferences/', Object.fromEntries(EMAIL.map(([k]) => [k, prefs[k]])))
    setSaving(false)
    if (res.success && res.data) { setSaved(res.data); setPrefs(res.data); toast.success('Preferences saved') } else toast.error(res.error || 'Couldn’t save.')
  }

  if (error) return <ErrorBanner title="Couldn’t load your preferences" message={error} />
  if (!prefs) return <Skeleton className="h-96 rounded-xl" />

  const allOn = EMAIL.every(([k]) => prefs[k])
  return (
    <>
      <Panel icon={Mail} title="Email" description="Sent to your sign-in address" delay={0.05}
        action={<button onClick={() => setPrefs(Object.assign({}, prefs, Object.fromEntries(EMAIL.map(([k]) => [k, !allOn]))))} className="text-sm font-medium text-brand hover:underline">{allOn ? 'Turn all off' : 'Turn all on'}</button>}>
        <ul className="divide-y">
          {EMAIL.map(([key, label, hint]) => (
            <li key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <label htmlFor={key} className="cursor-pointer"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></label>
              <Switch id={key} checked={!!prefs[key]} onCheckedChange={(v) => setPrefs({ ...prefs, [key]: v })} />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel icon={MessageSquare} title="Other channels" delay={0.1}>
        <ul className="divide-y">
          {LATER.map(([label, hint]) => (
            <li key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 opacity-70">
              <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Coming soon</span>
            </li>
          ))}
        </ul>
      </Panel>
      {dirty && (
        <FadeIn className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
          <span className="flex items-center gap-2 text-sm"><Bell className="h-4 w-4 text-brand" />Unsaved changes</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPrefs(saved)}>Discard</Button>
            <Button size="sm" onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </div>
        </FadeIn>
      )}
    </>
  )
}
