//components/auth/RegisterForm.tsx 
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, Building, Phone, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthUtils } from '@/hooks/useAuth'

interface RegisterFormData {
  email: string
  password: string
  password_confirm: string 
  first_name: string
  last_name: string
  phone_number?: string
  company_name: string
  company_industry?: string
  terms_accepted: boolean
}

interface PasswordStrength {
  score: number
  feedback: string[]
}

const INDUSTRY_OPTIONS = [
  'Manufacturing',
  'Retail',
  'Healthcare',
  'Technology',
  'Food & Beverage',
  'Automotive',
  'Pharmaceutical',
  'E-commerce',
  'Logistics & Transportation',
  'Agriculture',
  'Construction',
  'Other'
]

export function RegisterForm() {
  const { registerWithToast } = useAuthUtils()
  
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    company_name: '',
    company_industry: '',
    terms_accepted: false,
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Password strength calculation
  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('At least 8 characters')
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One uppercase letter')
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One lowercase letter')
    }

    if (/[0-9]/.test(password)) {
      score += 1
    } else {
      feedback.push('One number')
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('One special character')
    }

    return { score, feedback }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character'
    }

    // Confirm password validation
    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password'
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match'
    }

    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    } else if (formData.first_name.length > 50) {
      newErrors.first_name = 'First name must be less than 50 characters'
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    } else if (formData.last_name.length > 50) {
      newErrors.last_name = 'Last name must be less than 50 characters'
    }

    // Phone number validation (optional but format check if provided)
    if (formData.phone_number && formData.phone_number.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(formData.phone_number.replace(/[\s\-\(\)]/g, ''))) {
        newErrors.phone_number = 'Please enter a valid phone number'
      }
    }

    // Company name validation (required)
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    } else if (formData.company_name.length > 100) {
      newErrors.company_name = 'Company name must be less than 100 characters'
    }

    // Terms validation
    if (!formData.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      // Prepare data for submission - only include non-empty optional fields
      const registrationData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        terms_accepted: formData.terms_accepted,
        // Only include optional fields if they have values
        ...(formData.phone_number && { phone_number: formData.phone_number }),
        ...(formData.company_industry && { company_industry: formData.company_industry }),
      }

      await registerWithToast(registrationData)
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Get started with your LogiFlow journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={errors.first_name ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={errors.last_name ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone Number Field (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className={`pl-10 ${errors.phone_number ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number}</p>
              )}
            </div>

            {/* Company Name Field */}
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Enter your company name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className={`pl-10 ${errors.company_name ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name}</p>
              )}
            </div>

            {/* Company Industry Field (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="company_industry">Industry</Label>
              <Select
                value={formData.company_industry}
                onValueChange={(value) => handleInputChange('company_industry', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(passwordStrength.score / 5) * 100} 
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {passwordStrength.score <= 2 ? 'Weak' :
                       passwordStrength.score <= 3 ? 'Fair' :
                       passwordStrength.score <= 4 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">Password requirements:</p>
                      <ul className="space-y-1">
                        {[
                          'At least 8 characters',
                          'One uppercase letter',
                          'One lowercase letter',
                          'One number',
                          'One special character'
                        ].map((requirement, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            {!passwordStrength.feedback.includes(requirement) ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={!passwordStrength.feedback.includes(requirement) ? 'text-green-600' : 'text-muted-foreground'}>
                              {requirement}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password_confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.password_confirm}
                  onChange={(e) => handleInputChange('password_confirm', e.target.value)}
                  className={`pl-10 pr-10 ${errors.password_confirm ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password_confirm && (
                <p className="text-sm text-destructive">{errors.password_confirm}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.terms_accepted}
                  onCheckedChange={(checked) => handleInputChange('terms_accepted', checked as boolean)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-5">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.terms_accepted && (
                <p className="text-sm text-destructive">{errors.terms_accepted}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}