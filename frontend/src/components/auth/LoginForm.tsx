// components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthHeader, EMAIL_PATTERN, Field, FormAlert, PasswordField, SubmitButton } from './AuthFormParts'

export function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const next: Record<string, string> = {}
    if (!email) next.email = 'Enter your email address'
    else if (!EMAIL_PATTERN.test(email)) next.email = 'That doesn’t look like a valid email address'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (!validate()) return

    setIsLoading(true)
    // On success the auth context redirects to the dashboard (or platform admin)
    const result = await login({ email, password })
    if (!result.success) {
      setFormError(result.error || 'We couldn’t sign you in. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div>
      <AuthHeader title="Welcome back" subtitle="Sign in to your LogiFlow workspace." />
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
          error={errors.email}
          disabled={isLoading}
          onChange={(e) => {
            setEmail(e.target.value)
            setErrors((p) => ({ ...p, email: '' }))
          }}
        />
        <div>
          <PasswordField
            label="Password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            error={errors.password}
            disabled={isLoading}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((p) => ({ ...p, password: '' }))
            }}
          />
          <div className="mt-2 text-right">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton loading={isLoading} loadingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to LogiFlow?{' '}
        <Link href="/auth/register" className="font-medium text-brand hover:underline">
          Start your 14-day free trial
        </Link>
      </p>
    </div>
  )
}
