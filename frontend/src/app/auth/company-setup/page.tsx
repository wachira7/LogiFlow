// frontend/src/app/auth/company-setup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building, MapPin, Globe, Phone, Users, ArrowRight, Loader2, CheckCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { CompanyService } from '@/services/companyService'
import { INDUSTRIES, CURRENCIES, TIMEZONES } from '@/types/company.types'
import { PrivateRoute} from '@/components/auth/AuthGuard'

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '500+', label: '500+ employees' },
]

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Preferences', icon: Settings },
]

interface SetupFormData {
  name: string
  industry: string
  company_size: string
  website: string
  phone: string
  description: string
  address: string
  city: string
  country: string
  timezone: string
  currency: string
}

function CompanySetupContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<SetupFormData>({
    name: '',
    industry: '',
    company_size: '',
    website: '',
    phone: '',
    description: '',
    address: '',
    city: '',
    country: 'Kenya',
    timezone: 'Africa/Nairobi',
    currency: 'KES',
  })

  const handleChange = (field: keyof SetupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Company name is required'
      if (!formData.industry) newErrors.industry = 'Please select an industry'
      if (!formData.company_size) newErrors.company_size = 'Please select company size'
    }
    if (step === 2) {
      if (!formData.city.trim()) newErrors.city = 'City is required'
      if (!formData.country.trim()) newErrors.country = 'Country is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => setCurrentStep(prev => prev - 1)

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    setIsLoading(true)

    try {
      const response = await CompanyService.updateCompany({
        name: formData.name,
        industry: formData.industry,
        company_size: formData.company_size,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        description: formData.description || undefined,
        address: formData.address || undefined,
        city: formData.city,
        country: formData.country,
        timezone: formData.timezone,
      })

      if (response.success) {
        // Update settings (currency, timezone)
        await CompanyService.updateSettings({
          timezone: formData.timezone,
          currency: formData.currency,
        })

        setIsComplete(true)
        toast({
          title: 'Setup complete!',
          description: 'Your workspace is ready.',
        })
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        toast({
          title: 'Setup failed',
          description: response.error || 'Please try again.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Success screen
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <div>
          <h2 className="font-serif font-bold text-2xl mb-2">You&apos;re all set!</h2>
          <p className="text-muted-foreground">Taking you to your dashboard...</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
      </motion.div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4"
        >
          <Building className="w-7 h-7 text-primary-foreground" />
        </motion.div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl">
          Set up your workspace
        </h1>
        <p className="text-muted-foreground">
          Hi {user?.first_name || 'there'}! Let&apos;s configure your company.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-primary' : isActive ? 'bg-cta' : 'bg-muted'
                }`}>
                  {isCompleted
                    ? <CheckCircle className="w-5 h-5 text-primary-foreground" />
                    : <Icon className={`w-5 h-5 ${isActive ? 'text-cta-foreground' : 'text-muted-foreground'}`} />
                  }
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-border mx-2 mb-5" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Company Info */}
        {currentStep === 1 && (
          <>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Your company name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className={`pl-10 h-11 ${errors.name ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                <SelectTrigger className={`h-11 ${errors.industry ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && <p className="text-sm text-destructive">{errors.industry}</p>}
            </div>

            <div className="space-y-2">
              <Label>Company Size *</Label>
              <div className="grid grid-cols-1 gap-2">
                {COMPANY_SIZES.map(size => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => handleChange('company_size', size.value)}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 text-left transition-colors ${
                      formData.company_size === size.value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    <Users className={`w-4 h-4 shrink-0 ${formData.company_size === size.value ? 'text-primary' : ''}`} />
                    <span className="text-sm font-medium">{size.label}</span>
                    {formData.company_size === size.value && (
                      <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              {errors.company_size && <p className="text-sm text-destructive">{errors.company_size}</p>}
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://yourcompany.com"
                  value={formData.website}
                  onChange={e => handleChange('website', e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brief Description</Label>
              <Textarea
                placeholder="What does your company do?"
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}

        {/*  Location */}
        {currentStep === 2 && (
          <>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="123 Business Ave"
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="Nairobi"
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  className={`h-11 ${errors.city ? 'border-destructive' : ''}`}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  placeholder="Kenya"
                  value={formData.country}
                  onChange={e => handleChange('country', e.target.value)}
                  className={`h-11 ${errors.country ? 'border-destructive' : ''}`}
                />
                {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+254 700 000 000"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </>
        )}

        {/* Preferences */}
        {currentStep === 3 && (
          <>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={formData.timezone} onValueChange={v => handleChange('timezone', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={v => handleChange('currency', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">You can change these anytime</p>
              <p>All settings can be updated later from <strong>Company → Settings</strong> in your dashboard.</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-11 bg-transparent"
            disabled={isLoading}
          >
            Back
          </Button>
        )}

        {currentStep < STEPS.length ? (
          <Button
            onClick={handleNext}
            className="flex-1 h-11 bg-cta hover:bg-cta/90 text-cta-foreground font-semibold"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="flex-1 h-11 bg-cta hover:bg-cta/90 text-cta-foreground font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</>
            ) : (
              <>Complete Setup<ArrowRight className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        )}
      </div>

      {/* Skip */}
      <div className="text-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4"
        >
          Skip for now, I&apos;ll set this up later
        </button>
      </div>
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