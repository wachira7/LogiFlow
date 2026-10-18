// components/auth/ResetPasswordForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { AuthHeader, FormAlert, PasswordField, SubmitButton } from './AuthFormParts'

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? ''
  const router = useRouter()
  const { resetPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft">
          <KeyRound className="h-8 w-8 text-danger" />
        </span>
        <AuthHeader title="This link isn’t complete" subtitle="Open the reset link from your email again, or request a new one." />
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    const next: Record<string, string> = {}
    if (password.length < 8) next.password = 'Use at least 8 characters'
    if (password !== confirm) next.password_confirm = 'Passwords don’t match'
    setErrors(next)
    if (Object.keys(next).length) return

    setIsLoading(true)
    const result = await resetPassword({ token, password, password_confirm: confirm })
    setIsLoading(false)
    if (result.success) {
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 2500)
      return
    }
    const fieldErrors = result.fieldErrors ?? {}
    setErrors({ password: fieldErrors.password ?? '', password_confirm: fieldErrors.password_confirm ?? '' })
    if (fieldErrors.token || !(fieldErrors.password || fieldErrors.password_confirm)) {
      setFormError(fieldErrors.token || result.error || 'We couldn’t reset your password. Please try again.')
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="status">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft"
          >
            <CheckCircle2 className="h-8 w-8 text-success" />
          </motion.span>
          <AuthHeader title="Password updated" subtitle="You’ve been signed out on other devices. Taking you to sign in…" />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -12 }}>
          <AuthHeader title="Choose a new password" subtitle="Pick something you haven’t used here before." />
          <FormAlert message={formError} />
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <PasswordField label="New password" icon={Lock} autoComplete="new-password" autoFocus value={password}
              error={errors.password} disabled={isLoading}
              hint="At least 8 characters. Mix letters, numbers and symbols for a stronger password."
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }} />
            <PasswordField label="Confirm new password" icon={Lock} autoComplete="new-password" value={confirm}
              error={errors.password_confirm} disabled={isLoading}
              onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, password_confirm: '' })) }} />
            <SubmitButton loading={isLoading} loadingText="Updating password…">
              Update password
            </SubmitButton>
          </form>
          <Link href="/auth/login" className="group mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to sign in
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
