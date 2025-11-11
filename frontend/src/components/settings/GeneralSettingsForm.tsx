// components/settings/GeneralSettingsForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, User, Mail, Phone, Globe, Calendar, DollarSign } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'sw', label: 'Swahili' },
]

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
]

export function GeneralSettingsForm() {
  const { user, isLoading, error, success, updateGeneralSettings, uploadAvatar, clearMessages, getGeneralSettings } = useSettings()
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    timezone: 'UTC',
    language: 'en',
    date_format: 'MM/DD/YYYY',
    currency: 'USD',
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  // Initialize form with user data
  useEffect(() => {
    const settings = getGeneralSettings()
    if (settings) {
      setFormData({
        first_name: settings.first_name,
        last_name: settings.last_name,
        phone_number: settings.phone_number,
        timezone: settings.timezone,
        language: settings.language,
        date_format: settings.date_format,
        currency: settings.currency,
      })
      setAvatarPreview(settings.profile_picture)
    }
  }, [getGeneralSettings])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    clearMessages()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return

    setIsUploading(true)
    const uploaded = await uploadAvatar(avatarFile)
    setIsUploading(false)

    if (uploaded) {
      setAvatarFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateGeneralSettings(formData)
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Profile Picture */}
      <SettingsCard
        title="Profile Picture"
        description="Upload a profile picture for your account"
        icon={User}
      >
        <div className="flex items-center space-x-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarPreview} />
            <AvatarFallback className="text-2xl">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="mb-2"
            />
            <p className="text-sm text-muted-foreground">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>

          {avatarFile && (
            <Button
              onClick={handleAvatarUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          )}
        </div>
      </SettingsCard>

      {/* Personal Information */}
      <SettingsCard
        title="Personal Information"
        description="Update your personal details"
        icon={User}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </SettingsCard>

      {/* Preferences */}
      <SettingsCard
        title="Preferences"
        description="Customize your experience"
        icon={Globe}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span>Timezone</span>
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span>Language</span>
              </Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleInputChange('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_format" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Date Format</span>
              </Label>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleInputChange('date_format', value)}
              >
                <SelectTrigger id="date_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>Currency</span>
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </SettingsCard>
    </div>
  )
}