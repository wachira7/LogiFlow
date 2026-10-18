// frontend/src/app/auth/company-setup/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Building2, Check, CheckCircle2, Globe, MapPin, Phone } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { AuthHeader, Field, FieldError, FormAlert, SubmitButton } from '@/components/auth/AuthFormParts'
import { CompanyService } from '@/services/companyService'
import { CURRENCIES, INDUSTRIES, TIMEZONES } from '@/types/company.types'
import { cn } from '@/lib/utils'

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-500', label: '201–500 people' },
  { value: '500+', label: '500+ people' },
]

const STEPS = ['Company', 'Location', 'Preferences'] as const

type SetupForm = {
  name: string
  industry: string
  company_size: string
  website: string
  phone: string
  address: string
  city: string
  country: string
  timezone: string
  currency: string
}

function SelectField({
  id, label, value, onChange, placeholder, error, children,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className={cn('h-11 w-full', error && 'border-danger')} aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function CompanySetupContent() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<SetupForm>({
    name: '', industry: '', company_size: '', website: '', phone: '',
    address: '', city: '', country: 'Kenya', timezone: 'Africa/Nairobi', currency: 'KES',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // Pre-fill what we already know from sign-up
  useEffect(() => {
    CompanyService.getCompany().then((res) => {
      if (res.success && res.data) {
        const c = res.data
        setForm((f) => ({
          ...f,
          name: c.name || f.name,
          industry: c.industry && c.industry !== 'Not specified' ? c.industry : f.industry,
          company_size: c.company_size || f.company_size,
          website: c.website || f.website,
          phone: c.phone || f.phone,
        }))
      }
    })
  }, [])

  const set = (field: keyof SetupForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Enter your company name'
      if (!form.industry) e.industry = 'Choose an industry'
      if (!form.company_size) e.company_size = 'Choose your team size'
      if (form.website && !/^https?:\/\/\S+\.\S+/.test(form.website)) e.website = 'Start with https://, e.g. https://duka.co.ke'
    }
    if (s === 1) {
      if (!form.city.trim()) e.city = 'Enter your city'
      if (!form.country.trim()) e.country = 'Enter your country'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (!validate(step)) return
    if (step < STEPS.length - 1) return go(step + 1)

    setSaving(true)
    // City and country are kept as part of the address (the company record has one address field)
    const address = [form.address, form.city, form.country].map((p) => p.trim()).filter(Boolean).join(', ')
    const company = await CompanyService.updateCompany({
      name: form.name.trim(),
      industry: form.industry,
      company_size: form.company_size,
      website: form.website || undefined,
      phone: form.phone || undefined,
      address,
      timezone: form.timezone,
      onboarding_completed: true,
    })
    if (!company.success) {
      setSaving(false)
      setErrors(company.fieldErrors ?? {})
      if (company.fieldErrors?.name || company.fieldErrors?.industry) go(0)
      if (!company.fieldErrors) setFormError(company.error || 'We couldn’t save your company details. Please try again.')
      return
    }
    await CompanyService.updateSettings({ timezone: form.timezone, currency: form.currency })
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2200)
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="status">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft"
        >
          <CheckCircle2 className="h-8 w-8 text-success" />
        </motion.span>
        <AuthHeader title="Your workspace is ready" subtitle={`Welcome to LogiFlow, ${form.name}. Taking you to your dashboard…`} />
      </motion.div>
    )
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -40 }),
  }

  return (
    <div>
      <AuthHeader title="Set up your workspace" subtitle="A few details so LogiFlow fits how you work. You can change them later." />

      {/* progress */}
      <ol className="mb-8 flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300',
                step > i ? 'border-brand bg-brand text-brand-foreground' : step === i ? 'border-brand text-brand' : 'border-border text-muted-foreground',
              )}
            >
              {step > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('hidden text-sm font-medium sm:inline', step >= i ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded bg-border">
                <motion.span className="absolute inset-y-0 left-0 bg-brand" animate={{ width: step > i ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </li>
        ))}
      </ol>

      <FormAlert message={formError} />

      <form onSubmit={handleSubmit} noValidate>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <Field label="Company name" icon={Building2} value={form.name} error={errors.name} autoFocus
                  onChange={(e) => set('name', e.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField id="industry" label="Industry" value={form.industry} onChange={(v) => set('industry', v)}
                    placeholder="Choose industry" error={errors.industry}>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectField>
                  <SelectField id="company_size" label="Team size" value={form.company_size} onChange={(v) => set('company_size', v)}
                    placeholder="Choose size" error={errors.company_size}>
                    {COMPANY_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectField>
                </div>
                <Field label="Website (optional)" icon={Globe} type="url" placeholder="https://duka.co.ke" value={form.website}
                  error={errors.website} onChange={(e) => set('website', e.target.value)} />
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Street address (optional)" icon={MapPin} placeholder="Industrial Area, Enterprise Rd" value={form.address}
                  autoComplete="street-address" error={errors.address} autoFocus onChange={(e) => set('address', e.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" value={form.city} error={errors.city} autoComplete="address-level2"
                    onChange={(e) => set('city', e.target.value)} />
                  <Field label="Country" value={form.country} error={errors.country} autoComplete="country-name"
                    onChange={(e) => set('country', e.target.value)} />
                </div>
                <Field label="Company phone (optional)" icon={Phone} type="tel" placeholder="+254 712 345678" value={form.phone}
                  error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
              </>
            )}
            {step === 2 && (
              <>
                <SelectField id="timezone" label="Time zone" value={form.timezone} onChange={(v) => set('timezone', v)} placeholder="Choose time zone">
                  {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectField>
                <SelectField id="currency" label="Currency for reports and prices" value={form.currency} onChange={(v) => set('currency', v)} placeholder="Choose currency">
                  {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} · {c.name}</SelectItem>)}
                </SelectField>
              </>
            )}

            <SubmitButton loading={saving} loadingText="Saving…">
              {step < STEPS.length - 1 ? 'Continue' : 'Finish setup'}
            </SubmitButton>
            <div className="flex items-center justify-between text-sm">
              {step > 0 ? (
                <button type="button" onClick={() => go(step - 1)} disabled={saving}
                  className="group flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
                </button>
              ) : <span />}
              <button type="button" onClick={() => router.push('/dashboard')} disabled={saving}
                className="font-medium text-muted-foreground transition-colors hover:text-foreground">
                Skip for now
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </form>
    </div>
  )
}

export default function CompanySetupPage() {
  return (
    <PrivateRoute>
      <CompanySetupContent />
    </PrivateRoute>
  )
}
