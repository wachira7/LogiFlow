// src/app/(app)/company/profile/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Camera, CreditCard, Globe, Loader2, Mail, MapPin, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { teamService, type CompanyInfo } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn, ease } from '@/components/app/motion'
import { formatDay } from '@/lib/format'

const INDUSTRIES = ['Retail', 'Wholesale & distribution', 'Manufacturing', 'Food & beverage', 'Agriculture', 'Pharmaceuticals', 'E-commerce', 'Construction', 'Transport & logistics', 'Other']
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

type Form = Pick<CompanyInfo, 'name' | 'email' | 'phone' | 'website' | 'address' | 'industry' | 'company_size'>

export default function CompanyProfilePage() {
  const { user } = useAuth()
  const canEdit = !!user?.is_company_owner
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    teamService.company().then((c) => {
      setCompany(c)
      setForm({ name: c.name, email: c.email, phone: c.phone, website: c.website, address: c.address, industry: c.industry, company_size: c.company_size })
    }).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load the company.'))
  }, [])

  const set = (k: keyof Form, v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f))
    setErrors((e) => ({ ...e, [k]: '' }))
  }
  const dirty = company && form && (Object.keys(form) as (keyof Form)[]).some((k) => (form[k] ?? '') !== (company[k] ?? ''))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Enter your company name'
    if (form.website && !/^https?:\/\//.test(form.website)) next.website = 'Start with https://'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      setCompany(await teamService.updateCompany(form))
      toast.success('Company details saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save.')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('The image must be 5 MB or smaller.')
    setUploading(true)
    try {
      const res = await teamService.uploadLogo(file)
      setCompany((c) => (c ? { ...c, logo: res.logo_url } : c))
      toast.success('Logo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t upload the logo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (error) return <div className="space-y-6"><PageHeader icon={Building2} title="Company" /><ErrorBanner title="Couldn’t load the company" message={error} /></div>
  if (!company || !form) return <div className="space-y-6"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-96 rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="Company" description={canEdit ? 'How your company appears to your team and on documents.' : 'Your company’s details. Only owners can change them.'} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-card to-card p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 animate-float-slow rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <button type="button" disabled={!canEdit || uploading} onClick={() => fileRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-card bg-card shadow-md disabled:cursor-default" aria-label="Change logo">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={`${company.name} logo`} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-brand text-2xl font-semibold text-brand-foreground">{company.name.slice(0, 1).toUpperCase()}</span>
            )}
            {canEdit && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{company.name}</h2>
            <p className="text-sm text-muted-foreground">{[company.industry, company.company_size && `${company.company_size} people`].filter(Boolean).join(' · ') || 'Add your industry and size below'}</p>
            <p className="mt-1 text-xs text-muted-foreground">On LogiFlow since {formatDay(company.created_at)}</p>
          </div>
        </div>
      </motion.section>

      <AppStagger className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/company/users', icon: Users, title: `${company.users_count} ${company.users_count === 1 ? 'member' : 'members'}`, sub: company.seats_limit ? `${company.seats_used} of ${company.seats_limit} seats used` : 'Manage your team' },
          { href: '/billing', icon: CreditCard, title: company.subscription_plan ?? 'No plan yet', sub: company.subscription_status ? company.subscription_status.replace('_', ' ').toLowerCase() : 'Start your free trial' },
          { href: '/company/settings', icon: Globe, title: `${company.currency} · ${company.timezone}`, sub: 'Currency and region' },
        ].map((c) => (
          <AppStaggerItem key={c.href}>
            <Link href={c.href} className="card-lift group flex items-center gap-3 rounded-xl border bg-card p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><c.icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium capitalize-first">{c.title}</span><span className="block truncate text-xs capitalize text-muted-foreground">{c.sub}</span></span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </AppStaggerItem>
        ))}
      </AppStagger>

      <form onSubmit={save} noValidate>
        <Panel title="Details" delay={0.12}>
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-name">Company name</Label>
              <Input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} className={errors.name ? 'border-danger' : ''} />
              {errors.name && <p className="text-xs font-medium text-danger">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email"><Mail className="mr-1 inline h-3.5 w-3.5" />Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone"><Phone className="mr-1 inline h-3.5 w-3.5" />Phone</Label>
              <Input id="c-phone" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254 712 345 678" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-industry">Industry</Label>
              <Select value={form.industry || undefined} onValueChange={(v) => set('industry', v)}>
                <SelectTrigger id="c-industry" className="w-full"><SelectValue placeholder="Choose an industry" /></SelectTrigger>
                <SelectContent>{[...new Set([...INDUSTRIES, ...(form.industry ? [form.industry] : [])])].map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-size">Company size</Label>
              <Select value={form.company_size || undefined} onValueChange={(v) => set('company_size', v)}>
                <SelectTrigger id="c-size" className="w-full"><SelectValue placeholder="How many people?" /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s} people</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-web"><Globe className="mr-1 inline h-3.5 w-3.5" />Website</Label>
              <Input id="c-web" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" className={errors.website ? 'border-danger' : ''} />
              {errors.website && <p className="text-xs font-medium text-danger">{errors.website}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-address"><MapPin className="mr-1 inline h-3.5 w-3.5" />Address</Label>
              <Textarea id="c-address" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, town, county" />
            </div>
          </fieldset>
          {canEdit && (
            <FadeIn className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
              {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
              <Button type="submit" disabled={saving || !dirty} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
            </FadeIn>
          )}
        </Panel>
      </form>
    </div>
  )
}
