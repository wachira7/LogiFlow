//components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'

interface LoginFormData {
  email: string
  password: string
  remember_me: boolean
}

export function LoginForm() {
  const { login } = useAuth()
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember_me: false,
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      console.log('🔐 Attempting login...')
      
      const success = await login({
        email: formData.email,
        password: formData.password,
      })
      
      if (success) {
        console.log('✅ Login successful!')
        
        // Get user from localStorage and redirect immediately
        const userStr = localStorage.getItem('user')
        
        if (userStr) {
          const user = JSON.parse(userStr)
          console.log('👤 User:', user.email, '| Role:', user.role, '| Is Platform Admin:', user.is_platform_admin)
          
          // CHECK ROLE AND FORCE REDIRECT
          if (user.is_platform_admin || user.role === 'platform_admin') {
            console.log('🚀 Platform admin detected - forcing redirect to /platform-admin')
            window.location.href = '/platform-admin'
          } else {
            console.log('🚀 Regular user - forcing redirect to /dashboard')
            window.location.href = '/dashboard'
          }
        } else {
          // Fallback if user not in localStorage yet
          console.log('⚠️ User not in localStorage, waiting 500ms...')
          setTimeout(() => {
            const retryUser = localStorage.getItem('user')
            if (retryUser) {
              const user = JSON.parse(retryUser)
              const destination = (user.is_platform_admin || user.role === 'platform_admin') 
                ? '/platform-admin' 
                : '/dashboard'
              console.log('🚀 Retry redirect to:', destination)
              window.location.href = destination
            } else {
              console.log('⚠️ Still no user, defaulting to /dashboard')
              window.location.href = '/dashboard'
            }
          }, 500)
        }
      } else {
        setErrors({ email: 'Invalid email or password' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ email: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
  <div className="space-y-6">
    {/* Header */}
    <div className="text-center space-y-2">
      <div className="flex justify-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Lock className="w-7 h-7 text-primary-foreground" />
        </motion.div>
      </div>
      <h1 className="font-serif font-bold text-2xl sm:text-3xl text-foreground">
        Welcome back
      </h1>
      <p className="text-muted-foreground">
        Sign in to your LogiFlow account
      </p>
    </div>

    {/* Form */}
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`pl-10 h-11 ${errors.email ? 'border-destructive' : ''}`}
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {errors.email}
          </motion.p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`pl-10 pr-10 h-11 ${errors.password ? 'border-destructive' : ''}`}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
        {errors.password && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {errors.password}
          </motion.p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={formData.remember_me}
            onCheckedChange={(checked) => handleInputChange('remember_me', checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="remember" className="text-sm font-normal">Remember me</Label>
        </div>
        <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-cta hover:bg-cta/90 text-cta-foreground font-semibold text-base"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>

    {/* Divider */}
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">New to LogiFlow?</span>
      </div>
    </div>

    <Link href="/auth/register">
      <Button variant="outline" className="w-full h-11 bg-transparent">
        Create an account
      </Button>
    </Link>
  </div>
 )
}