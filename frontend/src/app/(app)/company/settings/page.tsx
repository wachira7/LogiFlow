// src/app/(app)/company/settings/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Clock, Globe, Loader2, Lock, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { teamService, type CompanySettingsData } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { FadeIn } from '@/components/app/motion'
import { formatMoney, setCompanyCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const CURRENCIES: [string, string][] = [
  ['KES', 'Kenyan shilling'], ['UGX', 'Ugandan shilling'], ['TZS', 'Tanzanian shilling'], ['RWF', 'Rwandan franc'], ['ETB', 'Ethiopian birr'],
  ['NGN', 'Nigerian naira'], ['GHS', 'Ghanaian cedi'], ['ZAR', 'South African rand'], ['EGP', 'Egyptian pound'], ['MAD', 'Moroccan dirham'],
  ['USD', 'US dollar'], ['EUR', 'Euro'], ['GBP', 'British pound'], ['AED', 'UAE dirham'], ['INR', 'Indian rupee'], ['CNY', 'Chinese yuan'],
]
const ZONES = ['Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Kigali', 'Africa/Addis_Ababa', 'Africa/Lagos', 'Africa/Accra',
  'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Casablanca', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'America/New_York', 'UTC']
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const TIMEOUTS: [number, string][] = [[30, '30 minutes'], [60, '1 hour'], [240, '4 hours'], [480, '8 hours'], [1440, '24 hours']]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function CompanySettingsPage() {
  const { user, refreshAuth } = useAuth()
  const canEdit = !!user?.is_company_owner
  const [saved, setSaved] = useState<CompanySettingsData | null>(null)
  const [form, setForm] = useState<CompanySettingsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teamService.settings().then((s) => {
      const norm = { ...s, working_hours_start: s.working_hours_start.slice(0, 5), working_hours_end: s.working_hours_end.slice(0, 5) }
      setSaved(norm)
      setForm(norm)
    }).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load settings.'))
  }, [])

  const dirty = useMemo(() => !!saved && !!form && JSON.stringify(saved) !== JSON.stringify(form), [saved, form])
  const set = <K extends keyof CompanySettingsData>(k: K, v: CompanySettingsData[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const toggleDay = (d: string) => form && set('working_days', form.working_days.includes(d) ? form.working_days.filter((x) => x !== d) : [...form.working_days, d])

  const save = async () => {
    if (!form) return
    if (!form.working_days.length) return toast.error('Pick at least one working day.')
    setSaving(true)
    try {
      const res = await teamService.updateSettings(form)
      const norm = { ...res, working_hours_start: res.working_hours_start.slice(0, 5), working_hours_end: res.working_hours_end.slice(0, 5) }
      setSaved(norm)
      setForm(norm)
      setCompanyCurrency(res.currency)
      // The app shell reads the currency from the signed-in user, so reload it
      await refreshAuth()
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="space-y-6"><PageHeader icon={Settings} title="Company settings" /><ErrorBanner title="Couldn’t load settings" message={error} /></div>
  if (!form) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-60 rounded-xl" /></div>

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={Settings} title="Company settings" description={canEdit ? 'Money, time and working hours for everyone in your company.' : 'Only owners can change these.'} />

      <fieldset disabled={!canEdit} className="space-y-6">
        <Panel icon={Globe} title="Money & region" description="Every price and total in LogiFlow uses this currency" delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-currency">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger id="s-currency" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(([c, n]) => <SelectItem key={c} value={c}><span className="font-medium">{c}</span><span className="ml-2 text-muted-foreground">{n}</span></SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Looks like: <span className="font-medium text-foreground">{formatMoney(12500, form.currency)}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-tz">Time zone</Label>
              <Select value={form.timezone} onValueChange={(v) => set('timezone', v)}>
                <SelectTrigger id="s-tz" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Set([...ZONES, form.timezone])].map((z) => <SelectItem key={z} value={z}>{z.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-date">Date format</Label>
              <Select value={form.date_format} onValueChange={(v) => set('date_format', v as CompanySettingsData['date_format'])}>
                <SelectTrigger id="s-date" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (19/10/2026)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (10/19/2026)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-10-19)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clock</Label>
              <div className="inline-flex w-full rounded-lg border p-1">
                {(['24h', '12h'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => set('time_format', t)}
                    className={cn('flex-1 rounded-md py-1.5 text-sm font-medium transition-colors', form.time_format === t ? 'bg-brand-soft text-brand' : 'text-muted-foreground hover:text-foreground')}>
                    {t === '24h' ? '24-hour (14:30)' : '12-hour (2:30 PM)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel icon={Briefcase} title="Working week" description="Used for schedules, due dates and reports" delay={0.1}>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = form.working_days.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={on}
                      className={cn('h-10 w-12 rounded-lg border text-sm font-medium transition-all', on ? 'border-brand bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:border-brand/40')}>
                      {cap(d).slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-start"><Clock className="mr-1 inline h-3.5 w-3.5" />Day starts</Label>
                <Input id="s-start" type="time" value={form.working_hours_start} onChange={(e) => set('working_hours_start', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-end">Day ends</Label>
                <Input id="s-end" type="time" value={form.working_hours_end} onChange={(e) => set('working_hours_end', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-fy">Financial year starts</Label>
                <Select value={form.fiscal_year_start} onValueChange={(v) => set('fiscal_year_start', v)}>
                  <SelectTrigger id="s-fy" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{cap(m)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Panel>

        <Panel icon={Lock} title="Security & notifications" delay={0.15}>
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium">Sign people out after inactivity</p><p className="text-xs text-muted-foreground">Applies to everyone in the company.</p></div>
              <Select value={String(form.session_timeout)} onValueChange={(v) => set('session_timeout', Number(v))}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Map([...TIMEOUTS, [form.session_timeout, `${form.session_timeout} minutes`] as [number, string]]).entries()].sort((a, b) => a[0] - b[0]).map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-medium">Company email notifications</p><p className="text-xs text-muted-foreground">Invitations, payment receipts and important alerts. Each person can fine-tune theirs in Settings › Notifications.</p></div>
              <Switch checked={form.email_notifications} onCheckedChange={(v) => set('email_notifications', v)} aria-label="Company email notifications" />
            </div>
          </div>
        </Panel>
      </fieldset>

      {canEdit && dirty && (
        <FadeIn className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
          <span className="text-sm">You have unsaved changes</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setForm(saved)}>Discard</Button>
            <Button size="sm" onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </div>
        </FadeIn>
      )}
    </div>
  )
}
