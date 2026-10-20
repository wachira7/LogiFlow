// src/app/(app)/settings/general/page.tsx
// Personal profile: name, phone and photo.
'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { AuthService } from '@/services/authService'
import { roleLabel } from '@/services/teamService'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/app/kit'
import { formatDay } from '@/lib/format'

export default function ProfileSettingsPage() {
  const { user, refreshAuth } = useAuth()
  const [form, setForm] = useState({ first_name: '', last_name: '', phone_number: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) setForm({ first_name: user.first_name ?? '', last_name: user.last_name ?? '', phone_number: user.phone_number ?? '' })
  }, [user])

  if (!user) return null
  const dirty = form.first_name !== (user.first_name ?? '') || form.last_name !== (user.last_name ?? '') || form.phone_number !== (user.phone_number ?? '')
  const initials = `${form.first_name[0] ?? ''}${form.last_name[0] ?? ''}`.toUpperCase() || user.email[0].toUpperCase()

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) return toast.error('Enter your first name.')
    setSaving(true)
    try {
      const res = await AuthService.updateProfile(form)
      if (!res.success) throw new Error(res.error || 'Couldn’t save your profile.')
      await refreshAuth()
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file.')
    if (file.size > 5 * 1024 * 1024) return toast.error('The image must be 5 MB or smaller.')
    setUploading(true)
    try {
      const res = await AuthService.uploadAvatar(file)
      if (!res.success) throw new Error(res.error || 'Couldn’t upload the photo.')
      await refreshAuth()
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t upload the photo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <Panel delay={0.05} bodyClassName="p-5 sm:p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="group relative rounded-full" aria-label="Change photo">
            <Avatar className="h-20 w-20 ring-4 ring-brand/15">
              <AvatarImage src={user.profile_picture || undefined} />
              <AvatarFallback className="bg-brand text-xl font-semibold text-brand-foreground">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-brand" />{roleLabel(user.role === 'user' ? 'member' : user.role)} at {user.company_name}</p>
            {user.date_joined && <p className="text-xs text-muted-foreground">Member since {formatDay(user.date_joined)}</p>}
          </div>
        </div>
      </Panel>

      <form onSubmit={save}>
        <Panel title="Personal details" delay={0.1}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-first">First name</Label>
              <Input id="p-first" autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-last">Last name</Label>
              <Input id="p-last" autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email"><Mail className="mr-1 inline h-3.5 w-3.5" />Email</Label>
              <Input id="p-email" value={user.email} disabled />
              <p className="text-xs text-muted-foreground">Your sign-in email can’t be changed here.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone</Label>
              <Input id="p-phone" inputMode="tel" autoComplete="tel" placeholder="+254 712 345 678" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            <Button type="submit" disabled={!dirty || saving} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </div>
        </Panel>
      </form>
    </>
  )
}
