// src/app/(app)/settings/security/page.tsx
'use client'

import { useState } from 'react'
import { Check, KeyRound, Loader2, LogOut, MonitorSmartphone, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import { PasswordField } from '@/components/auth/AuthFormParts'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Panel } from '@/components/app/kit'
import { cn } from '@/lib/utils'

const RULES: [string, (p: string) => boolean][] = [
  ['At least 8 characters', (p) => p.length >= 8],
  ['A letter and a number', (p) => /[a-z]/i.test(p) && /\d/.test(p)],
  ['Not just numbers', (p) => !/^\d+$/.test(p)],
]

export default function SecuritySettingsPage() {
  const { changePassword, logout } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '', submit: '' }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.current) next.current = 'Enter your current password'
    if (!RULES.every(([, ok]) => ok(form.next))) next.next = 'Choose a stronger password'
    if (form.next !== form.confirm) next.confirm = 'Passwords don’t match'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    const ok = await changePassword({ current_password: form.current, new_password: form.next, new_password_confirm: form.confirm })
    setSaving(false)
    if (ok) {
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Password changed. Other devices have been signed out.')
    } else {
      setErrors({ submit: 'Couldn’t change the password. Check your current password and try again.' })
    }
  }

  const signOutEverywhere = async () => {
    setSigningOut(true)
    try {
      const res = await api.post('/api/v1/auth/logout-all/')
      if (!res.success) throw new Error(res.error)
      toast.success('Signed out of all devices')
      await logout()
    } catch {
      toast.error('Couldn’t sign out of all devices. Please try again.')
      setSigningOut(false)
      setConfirmAll(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
        <Panel icon={KeyRound} title="Change password" description="You’ll stay signed in here; other devices are signed out." delay={0.05}>
          <div className="max-w-md space-y-4">
            <PasswordField id="sec-current" label="Current password" value={form.current} onChange={(e) => set('current', e.target.value)} error={errors.current} autoComplete="current-password" />
            <PasswordField id="sec-new" label="New password" value={form.next} onChange={(e) => set('next', e.target.value)} error={errors.next} autoComplete="new-password" />
            {form.next && (
              <ul className="space-y-1 text-xs">
                {RULES.map(([label, ok]) => (
                  <li key={label} className={cn('flex items-center gap-1.5', ok(form.next) ? 'text-success' : 'text-muted-foreground')}>
                    {ok(form.next) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{label}
                  </li>
                ))}
              </ul>
            )}
            <PasswordField id="sec-confirm" label="Confirm new password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} error={errors.confirm} autoComplete="new-password" />
            {errors.submit && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{errors.submit}</p>}
            <Button type="submit" disabled={saving} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password</Button>
          </div>
        </Panel>
      </form>

      <Panel icon={MonitorSmartphone} title="Signed-in devices" delay={0.1}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-muted-foreground">Lost a phone or used a shared computer? Sign out everywhere, including this browser. You’ll need your password to sign back in.</p>
          <Button variant="outline" onClick={() => setConfirmAll(true)} className="shrink-0 text-danger hover:text-danger"><LogOut className="mr-2 h-4 w-4" />Sign out everywhere</Button>
        </div>
      </Panel>

      <ConfirmDialog open={confirmAll} onOpenChange={(o) => !signingOut && setConfirmAll(o)} title="Sign out of every device?"
        description="Every session ends, including this one." confirmText="Sign out everywhere" variant="destructive" loading={signingOut} onConfirm={signOutEverywhere} />
    </>
  )
}
