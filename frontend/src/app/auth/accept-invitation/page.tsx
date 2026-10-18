// src/app/auth/accept-invitation/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CheckCircle2, Lock, MailX, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AuthHeader, Field, FormAlert, PasswordField, SubmitButton } from '@/components/auth/AuthFormParts'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface InvitationDetails {
  email: string
  company_name: string
  role: string
  invited_by_name: string
}

/** Readable message + per-field errors from either error format the backend returns. */
function parseError(data: Record<string, unknown>, fallback: string) {
  const details = (data.details ?? data) as Record<string, unknown>
  const fieldErrors: Record<string, string> = {}
  for (const [k, v] of Object.entries(details ?? {})) {
    const msg = Array.isArray(v) ? v[0] : v
    if (typeof msg === 'string') fieldErrors[k] = msg
  }
  const message =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.message === 'string' && data.message) ||
    (typeof data.detail === 'string' && data.detail) ||
    fallback
  return { message, fieldErrors }
}

function AcceptInvitationContent() {
  const router = useRouter()
  const token = useSearchParams().get('token')

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone_number: '', password: '', password_confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('This invitation link is incomplete. Open it again from your email.')
      setLoadingToken(false)
      return
    }
    fetch(`${API}/api/v1/tenants/invitations/validate/?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) setInvitation(data)
        else setTokenError(parseError(data, 'This invitation is invalid or has expired.').message)
      })
      .catch(() => setTokenError('We couldn’t check this invitation. Please try again.'))
      .finally(() => setLoadingToken(false))
  }, [token])

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    const next: Record<string, string> = {}
    if (!form.first_name.trim()) next.first_name = 'Enter your first name'
    if (!form.last_name.trim()) next.last_name = 'Enter your last name'
    if (form.password.length < 8) next.password = 'Use at least 8 characters'
    if (form.password !== form.password_confirm) next.password_confirm = 'Passwords don’t match'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/v1/tenants/invitations/accept/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        const { message, fieldErrors } = parseError(data, 'We couldn’t accept this invitation.')
        setErrors(fieldErrors)
        if (!['first_name', 'last_name', 'password', 'password_confirm', 'phone_number'].some((f) => fieldErrors[f])) {
          setFormError(message)
        }
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 2500)
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingToken) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground" role="status">
        <LoadingSpinner size="md" />
        Checking your invitation…
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft">
          <MailX className="h-8 w-8 text-danger" />
        </span>
        <AuthHeader title="This invitation can’t be used" subtitle={`${tokenError} Ask your admin to send a new one.`} />
        <Button asChild variant="outline">
          <Link href="/auth/login">Go to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {success ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="status">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft"
          >
            <CheckCircle2 className="h-8 w-8 text-success" />
          </motion.span>
          <AuthHeader
            title={`Welcome to ${invitation?.company_name ?? 'the team'}`}
            subtitle="Your account is ready. Taking you to sign in…"
          />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -12 }}>
          <AuthHeader
            title="Join your team"
            subtitle={
              invitation ? (
                <>
                  <strong className="text-foreground">{invitation.invited_by_name}</strong> invited you to join{' '}
                  <strong className="text-foreground">{invitation.company_name}</strong> as {invitation.role.replace(/_/g, ' ')}.
                </>
              ) : undefined
            }
          />
          {invitation && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-brand-soft/50 px-4 py-3">
              <Building2 className="h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0 text-sm">
                <div className="text-muted-foreground">Signing up as</div>
                <div className="truncate font-medium">{invitation.email}</div>
              </div>
            </div>
          )}
          <FormAlert message={formError} />
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" icon={User} autoComplete="given-name" autoFocus value={form.first_name}
                error={errors.first_name} onChange={(e) => set('first_name', e.target.value)} />
              <Field label="Last name" autoComplete="family-name" value={form.last_name}
                error={errors.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
            <Field label="Phone (optional)" icon={Phone} type="tel" autoComplete="tel" placeholder="+254 712 345678"
              value={form.phone_number} error={errors.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
            <PasswordField label="Password" icon={Lock} autoComplete="new-password" value={form.password}
              error={errors.password} hint="At least 8 characters. Mix letters, numbers and symbols."
              onChange={(e) => set('password', e.target.value)} />
            <PasswordField label="Confirm password" icon={Lock} autoComplete="new-password" value={form.password_confirm}
              error={errors.password_confirm} onChange={(e) => set('password_confirm', e.target.value)} />
            <SubmitButton loading={submitting} loadingText="Creating your account…">
              Accept invitation
            </SubmitButton>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
