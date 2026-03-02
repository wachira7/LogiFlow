//components/auth/ForgotPasswordForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthUtils } from '@/hooks/useAuth'

export function ForgotPasswordForm() {
  const { forgotPasswordWithToast } = useAuthUtils()
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const success = await forgotPasswordWithToast(email)
      if (success) {
        setIsSuccess(true)
      }
    } catch (error) {
      console.error('Forgot password error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setEmail(value)
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }))
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto"
        >
          <CheckCircle className="w-7 h-7 text-white" />
        </motion.div>
        <div>
          <h1 className="font-serif font-bold text-2xl text-green-600">Check your email</h1>
          <p className="text-muted-foreground mt-1">
            We&apos;ve sent a reset link to <strong>{email}</strong>
          </p>
        </div>
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            If you don&apos;t see it, check your spam folder. Link expires in 24 hours.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => { setIsSuccess(false); setEmail('') }}>
            Send another email
          </Button>
          <Link href="/auth/login" className="block">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />Back to login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4"
        >
          <Mail className="w-7 h-7 text-primary-foreground" />
        </motion.div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl">Forgot password?</h1>
        <p className="text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`pl-10 h-11 ${errors.email ? 'border-destructive' : ''}`}
              disabled={isLoading}
            />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-cta hover:bg-cta/90 text-cta-foreground font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
          ) : 'Send reset link'}
        </Button>
      </form>

      <Link href="/auth/login" className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />Back to login
      </Link>
    </div>
  )
}