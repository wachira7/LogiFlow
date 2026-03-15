// components/settings/NotificationPreferences.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loader2, Bell, Mail, MessageSquare, Smartphone, AlertCircle } from 'lucide-react'
import { SettingsCard } from './SettingsCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { NotificationPreferences as NotificationPreferencesType } from '@/types/settings.types'

export function NotificationPreferences() {
  const {
    isLoading,
    isLoadingPreferences,
    error,
    success,
    notificationPreferences,
    updateNotificationPreferences,
    clearMessages,
  } = useSettings()

  const [preferences, setPreferences] = useState<NotificationPreferencesType>(notificationPreferences)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync with hook state when it loads from backend
  useEffect(() => {
    setPreferences(notificationPreferences)
  }, [notificationPreferences])

  const handleToggle = (field: keyof NotificationPreferencesType) => {
    setPreferences(prev => ({ ...prev, [field]: !prev[field] }))
    setHasChanges(true)
    clearMessages()
  }

  const handleSave = async () => {
    const saved = await updateNotificationPreferences(preferences)
    if (saved) setHasChanges(false)
  }

  const handleReset = () => {
    setPreferences(notificationPreferences)
    setHasChanges(false)
    clearMessages()
  }

  if (isLoadingPreferences) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" text="Loading preferences..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
      {hasChanges && (
        <Alert>
          <AlertDescription>
            You have unsaved changes. Click &quot;Save Preferences&quot; to apply them.
          </AlertDescription>
        </Alert>
      )}

      {/* Email Notifications */}
      <SettingsCard
        title="Email Notifications"
        description="Manage your email notification preferences"
        icon={Mail}
      >
        <div className="space-y-4">
          {[
            { field: 'email_order_updates' as const, label: 'Order Updates', desc: 'Receive notifications about order status changes' },
            { field: 'email_inventory_alerts' as const, label: 'Inventory Alerts', desc: 'Get notified when inventory levels are low' },
            { field: 'email_shipment_updates' as const, label: 'Shipment Updates', desc: 'Track shipment status and delivery updates' },
            { field: 'email_payment_confirmations' as const, label: 'Payment Confirmations', desc: 'Receive receipts and payment confirmations' },
            { field: 'email_team_invitations' as const, label: 'Team Invitations', desc: 'Get notified when team members are invited' },
            { field: 'email_system_updates' as const, label: 'System Updates', desc: 'Platform announcements and maintenance notices' },
          ].map(({ field, label, desc }, index, arr) => (
            <div key={field}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={field}
                  checked={preferences[field]}
                  onCheckedChange={() => handleToggle(field)}
                />
              </div>
              {index < arr.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* SMS Notifications */}
      <SettingsCard
        title="SMS Notifications"
        description="Manage your SMS notification preferences"
        icon={MessageSquare}
      >
        <div className="space-y-4">
          {[
            { field: 'sms_critical_alerts' as const, label: 'Critical Alerts', desc: 'Urgent notifications that require immediate attention' },
            { field: 'sms_order_confirmations' as const, label: 'Order Confirmations', desc: 'SMS confirmation when orders are placed' },
            { field: 'sms_delivery_updates' as const, label: 'Delivery Updates', desc: 'SMS notifications for delivery status changes' },
          ].map(({ field, label, desc }, index, arr) => (
            <div key={field}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={field}
                  checked={preferences[field]}
                  onCheckedChange={() => handleToggle(field)}
                />
              </div>
              {index < arr.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
          <div className="bg-muted p-4 rounded-lg mt-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Note:</strong> SMS notifications may incur additional charges from your mobile carrier.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Push Notifications */}
      <SettingsCard
        title="Push Notifications"
        description="Manage browser push notifications"
        icon={Bell}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_enabled">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow the browser to show notifications
              </p>
            </div>
            <Switch
              id="push_enabled"
              checked={preferences.push_enabled}
              onCheckedChange={() => handleToggle('push_enabled')}
            />
          </div>

          {preferences.push_enabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_order_updates">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about order status changes
                  </p>
                </div>
                <Switch
                  id="push_order_updates"
                  checked={preferences.push_order_updates}
                  onCheckedChange={() => handleToggle('push_order_updates')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_inventory_alerts">Inventory Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Low stock and inventory warnings
                  </p>
                </div>
                <Switch
                  id="push_inventory_alerts"
                  checked={preferences.push_inventory_alerts}
                  onCheckedChange={() => handleToggle('push_inventory_alerts')}
                />
              </div>
            </>
          )}

          {!preferences.push_enabled && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Enable push notifications to receive real-time updates in your browser.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Coming Soon */}
      <SettingsCard
        title="Notification Frequency"
        description="Control how often you receive notifications"
        icon={Smartphone}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📧 <strong>Email Digest:</strong> Receive a daily summary instead of individual emails (coming soon)
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              ⏰ <strong>Quiet Hours:</strong> Set times when you don&apos;t want notifications (coming soon)
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
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
    </div>
  )
}