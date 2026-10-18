// components/auth/ForgotPasswordForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthHeader, EMAIL_PATTERN, Field, FormAlert, SubmitButton } from './AuthFormParts'

export function ForgotPasswordForm() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (!email) return setError('Enter the email you signed up with')
    if (!EMAIL_PATTERN.test(email)) return setError('That doesn’t look like a valid email address')

    setIsLoading(true)
    const result = await forgotPassword({ email: email.trim() })
    setIsLoading(false)
    if (result.success) setSent(true)
    else setFormError(result.error || 'We couldn’t send the email. Please try again in a moment.')
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft"
          >
            <MailCheck className="h-8 w-8 text-brand" />
          </motion.span>
          <AuthHeader
            title="Check your email"
            subtitle={
              <>
                If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a link to reset
                your password. It works for one hour.
              </>
            }
          />
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder or{' '}
            <button type="button" onClick={() => setSent(false)} className="font-medium text-brand hover:underline">
              try again
            </button>
            .
          </p>
          <Link href="/auth/login" className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to sign in
          </Link>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <AuthHeader title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to choose a new one." />
          <FormAlert message={formError} />
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Field
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              value={email}
              error={error}
              disabled={isLoading}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(undefined)
              }}
            />
            <SubmitButton loading={isLoading} loadingText="Sending link…">
              Send reset link
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
