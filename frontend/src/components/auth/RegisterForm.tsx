// components/auth/RegisterForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Building2, Check, Lock, Mail, Phone, User } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthUtils } from '@/hooks/useAuth'
import { INDUSTRIES } from '@/types/company.types'
import { cn } from '@/lib/utils'
import { AuthHeader, EMAIL_PATTERN, Field, FieldError, FormAlert, PasswordField, SubmitButton } from './AuthFormParts'


const STEP_ONE_FIELDS = ['first_name', 'last_name', 'email', 'password', 'password_confirm']

type FormState = {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirm: string
  company_name: string
  company_industry: string
  phone_number: string
  terms_accepted: boolean
}

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Upper and lower case letters', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
  { label: 'A symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success']

function PasswordStrength({ password }: { password: string }) {
  const score = passwordChecks.filter((c) => c.test(password)).length
  if (!password) return null
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {passwordChecks.map((_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className={cn('block h-full rounded-full', strengthColor[score])}
                initial={false}
                animate={{ width: i < score ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </span>
          ))}
        </div>
        <span className="w-16 text-right text-xs font-medium text-muted-foreground">{strengthLabel[score]}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {passwordChecks.map((c) => {
          const ok = c.test(password)
          return (
            <li key={c.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', ok ? 'text-success' : 'text-muted-foreground')}>
              <Check className={cn('h-3 w-3 transition-opacity', ok ? 'opacity-100' : 'opacity-30')} />
              {c.label}
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

export function RegisterForm() {
  const { registerWithToast } = useAuthUtils()
  const reduce = useReducedMotion()
  const [step, setStep] = useState<1 | 2>(1)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<FormState>({
    first_name: '', last_name: '', email: '', password: '', password_confirm: '',
    company_name: '', company_industry: '', phone_number: '', terms_accepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const goTo = (next: 1 | 2) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const validateStepOne = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = 'Enter your first name'
    if (!form.last_name.trim()) e.last_name = 'Enter your last name'
    if (!form.email) e.email = 'Enter your work email'
    else if (!EMAIL_PATTERN.test(form.email)) e.email = 'That doesn’t look like a valid email address'
    if (form.password.length < 8) e.password = 'Use at least 8 characters'
    else if (/^\d+$/.test(form.password)) e.password = 'Use letters as well as numbers'
    if (!form.password_confirm) e.password_confirm = 'Confirm your password'
    else if (form.password !== form.password_confirm) e.password_confirm = 'Passwords don’t match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStepTwo = () => {
    const e: Record<string, string> = {}
    if (!form.company_name.trim()) e.company_name = 'Enter your company name'
    const phone = form.phone_number.replace(/[\s\-()]/g, '')
    if (phone && !/^\+?\d{7,15}$/.test(phone)) e.phone_number = 'Enter a valid phone number, e.g. +254 712 345678'
    if (!form.terms_accepted) e.terms_accepted = 'Please accept the terms to continue'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (step === 1) {
      if (validateStepOne()) goTo(2)
      return
    }
    if (!validateStepTwo()) return

    setIsLoading(true)
    const result = await registerWithToast({
      email: form.email.trim(),
      password: form.password,
      password_confirm: form.password_confirm,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      company_name: form.company_name.trim(),
      terms_accepted: form.terms_accepted,
      ...(form.phone_number && { phone_number: form.phone_number }),
      ...(form.company_industry && { company_industry: form.company_industry }),
    })
    if (!result.success) {
      setIsLoading(false)
      const fieldErrors = result.fieldErrors ?? {}
      setErrors(fieldErrors)
      // Server rejected something from step 1 (e.g. email already registered): take the user back to it
      if (Object.keys(fieldErrors).some((f) => STEP_ONE_FIELDS.includes(f))) goTo(1)
      if (!Object.keys(fieldErrors).length) setFormError(result.error || 'We couldn’t create your account. Please try again.')
    }
    // On success the auth context takes the user to company setup
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -40 }),
  }

  return (
    <div>
      <AuthHeader
        title={step === 1 ? 'Create your account' : 'Tell us about your company'}
        subtitle={step === 1 ? 'Start your 14-day free trial. It takes about a minute.' : 'You can change these details later in settings.'}
      />

      {/* progress */}
      <div className="mb-8 flex items-center gap-3" aria-label={`Step ${step} of 2`}>
        {[1, 2].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300',
                step > n ? 'border-brand bg-brand text-brand-foreground' : step === n ? 'border-brand text-brand' : 'border-border text-muted-foreground',
              )}
            >
              {step > n ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={cn('text-sm font-medium', step >= n ? 'text-foreground' : 'text-muted-foreground')}>
              {n === 1 ? 'Your account' : 'Your company'}
            </span>
            {n === 1 && (
              <span className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded bg-border">
                <motion.span className="absolute inset-y-0 left-0 bg-brand" animate={{ width: step === 2 ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </div>
        ))}
      </div>

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
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name" icon={User} autoComplete="given-name" autoFocus value={form.first_name}
                    error={errors.first_name} onChange={(e) => set('first_name', e.target.value)} />
                  <Field label="Last name" autoComplete="family-name" value={form.last_name}
                    error={errors.last_name} onChange={(e) => set('last_name', e.target.value)} />
                </div>
                <Field label="Work email" icon={Mail} type="email" autoComplete="email" placeholder="you@company.com"
                  value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)} />
                <div>
                  <PasswordField label="Password" icon={Lock} autoComplete="new-password" placeholder="Create a password"
                    value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} />
                  <PasswordStrength password={form.password} />
                </div>
                <PasswordField label="Confirm password" icon={Lock} autoComplete="new-password" placeholder="Type it again"
                  value={form.password_confirm} error={errors.password_confirm}
                  onChange={(e) => set('password_confirm', e.target.value)} />
                <SubmitButton>Continue</SubmitButton>
              </>
            ) : (
              <>
                <Field label="Company name" icon={Building2} autoComplete="organization" autoFocus placeholder="e.g. Duka Distributors"
                  value={form.company_name} error={errors.company_name} onChange={(e) => set('company_name', e.target.value)} />
                <div className="space-y-1.5">
                  <Label htmlFor="company_industry" className="text-sm font-medium">
                    Industry <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Select value={form.company_industry} onValueChange={(v) => set('company_industry', v)}>
                    <SelectTrigger id="company_industry" className="h-11 w-full">
                      <SelectValue placeholder="Choose your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Phone (optional)" icon={Phone} type="tel" autoComplete="tel" placeholder="+254 712 345678"
                  value={form.phone_number} error={errors.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <Checkbox id="terms" checked={form.terms_accepted} className="mt-0.5"
                      onCheckedChange={(c) => set('terms_accepted', c === true)} aria-describedby="terms-error" />
                    <Label htmlFor="terms" className="text-sm font-normal leading-5 text-muted-foreground">
                      I agree to LogiFlow&apos;s terms of service and privacy policy.
                    </Label>
                  </div>
                  <FieldError id="terms-error" message={errors.terms_accepted} />
                </div>
                <SubmitButton loading={isLoading} loadingText="Creating your account…">
                  Create account
                </SubmitButton>
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  disabled={isLoading}
                  className="group mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to your details
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
