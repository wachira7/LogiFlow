// components/settings/SecuritySettingsForm.tsx
'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock, Shield, Eye, EyeOff, Smartphone, AlertCircle } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

export function SecuritySettingsForm() {
  const { isLoading, error, success, changePassword, clearMessages } = useSettings()
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  })

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true)

  const handleInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
    clearMessages()
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      return
    }

    const success = await changePassword(passwordData)

    if (success) {
      // Reset form
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      })
    }
  }

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: '', color: '' }
    
    if (password.length < 6) {
      return { strength: 'Weak', color: 'text-red-600' }
    } else if (password.length < 10) {
      return { strength: 'Medium', color: 'text-yellow-600' }
    } else {
      return { strength: 'Strong', color: 'text-green-600' }
    }
  }

  const passwordStrength = getPasswordStrength(passwordData.new_password)

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Change Password */}
      <SettingsCard
        title="Change Password"
        description="Update your password to keep your account secure"
        icon={Lock}
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">Current Password</Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showPasswords.old ? 'text' : 'password'}
                value={passwordData.old_password}
                onChange={(e) => handleInputChange('old_password', e.target.value)}
                placeholder="Enter your current password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
              >
                {showPasswords.old ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => handleInputChange('new_password', e.target.value)}
                placeholder="Enter your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {passwordData.new_password && (
              <p className={`text-sm ${passwordStrength.color}`}>
                Password strength: {passwordStrength.strength}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password_confirm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="new_password_confirm"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.new_password_confirm}
                onChange={(e) => handleInputChange('new_password_confirm', e.target.value)}
                placeholder="Confirm your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {passwordData.new_password_confirm && 
             passwordData.new_password !== passwordData.new_password_confirm && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Password Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Include uppercase and lowercase letters</li>
              <li>• Include at least one number</li>
              <li>• Include at least one special character</li>
            </ul>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </form>
      </SettingsCard>

      {/* Two-Factor Authentication */}
      <SettingsCard
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
        icon={Smartphone}
        action={
          <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require a verification code in addition to your password
              </p>
            </div>
            <Switch
              id="two-factor"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>

          {twoFactorEnabled && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📱 Two-factor authentication is enabled. You&apos;ll need to enter a verification code from your authenticator app when signing in.
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                View Recovery Codes
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Security Alerts */}
      <SettingsCard
        title="Security Alerts"
        description="Get notified about important security events"
        icon={Shield}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="login-alerts">Login Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications when someone logs into your account
              </p>
            </div>
            <Switch
              id="login-alerts"
              checked={loginAlertsEnabled}
              onCheckedChange={setLoginAlertsEnabled}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Active Sessions */}
      <SettingsCard
        title="Active Sessions"
        description="Manage devices where you're currently logged in"
        icon={Smartphone}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-muted-foreground">
                  Chrome on Windows • Nairobi, Kenya
                </p>
                <p className="text-xs text-muted-foreground">Last active: Just now</p>
              </div>
            </div>
            <Badge>Active</Badge>
          </div>

          <Button variant="outline" className="w-full" disabled>
            Terminate All Other Sessions
          </Button>
        </div>
      </SettingsCard>
    </div>
  )
}