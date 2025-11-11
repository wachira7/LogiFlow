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
import type { NotificationPreferences as NotificationPreferencesType } from '@/types/settings.types'

export function NotificationPreferences() {
  const { isLoading, error, success, updateNotificationPreferences, getNotificationPreferences, clearMessages } = useSettings()
  
  const [preferences, setPreferences] = useState<NotificationPreferencesType | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    const loadedPreferences = getNotificationPreferences()
    setPreferences(loadedPreferences)
  }, [getNotificationPreferences])

  const handleToggle = (category: keyof NotificationPreferencesType, setting: string) => {
    if (!preferences) return

    setPreferences(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: !prev[category][setting as keyof typeof prev[typeof category]]
        }
      }
    })
    setHasChanges(true)
    clearMessages()
  }

  const handleSave = async () => {
    if (!preferences) return
    
    const success = await updateNotificationPreferences(preferences)
    if (success) {
      setHasChanges(false)
    }
  }

  const handleReset = () => {
    const defaultPreferences = getNotificationPreferences()
    setPreferences(defaultPreferences)
    setHasChanges(false)
    clearMessages()
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-order-updates">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about order status changes
              </p>
            </div>
            <Switch
              id="email-order-updates"
              checked={preferences.email_notifications.order_updates}
              onCheckedChange={() => handleToggle('email_notifications', 'order_updates')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-inventory-alerts">Inventory Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when inventory levels are low
              </p>
            </div>
            <Switch
              id="email-inventory-alerts"
              checked={preferences.email_notifications.inventory_alerts}
              onCheckedChange={() => handleToggle('email_notifications', 'inventory_alerts')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-shipment-updates">Shipment Updates</Label>
              <p className="text-sm text-muted-foreground">
                Track shipment status and delivery updates
              </p>
            </div>
            <Switch
              id="email-shipment-updates"
              checked={preferences.email_notifications.shipment_updates}
              onCheckedChange={() => handleToggle('email_notifications', 'shipment_updates')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-payment-confirmations">Payment Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                Receive receipts and payment confirmations
              </p>
            </div>
            <Switch
              id="email-payment-confirmations"
              checked={preferences.email_notifications.payment_confirmations}
              onCheckedChange={() => handleToggle('email_notifications', 'payment_confirmations')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-team-invitations">Team Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when team members are invited
              </p>
            </div>
            <Switch
              id="email-team-invitations"
              checked={preferences.email_notifications.team_invitations}
              onCheckedChange={() => handleToggle('email_notifications', 'team_invitations')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-system-updates">System Updates</Label>
              <p className="text-sm text-muted-foreground">
                Platform announcements and maintenance notices
              </p>
            </div>
            <Switch
              id="email-system-updates"
              checked={preferences.email_notifications.system_updates}
              onCheckedChange={() => handleToggle('email_notifications', 'system_updates')}
            />
          </div>
        </div>
      </SettingsCard>

      {/* SMS Notifications */}
      <SettingsCard
        title="SMS Notifications"
        description="Manage your SMS notification preferences"
        icon={MessageSquare}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-critical-alerts">Critical Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Urgent notifications that require immediate attention
              </p>
            </div>
            <Switch
              id="sms-critical-alerts"
              checked={preferences.sms_notifications.critical_alerts}
              onCheckedChange={() => handleToggle('sms_notifications', 'critical_alerts')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-order-confirmations">Order Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                SMS confirmation when orders are placed
              </p>
            </div>
            <Switch
              id="sms-order-confirmations"
              checked={preferences.sms_notifications.order_confirmations}
              onCheckedChange={() => handleToggle('sms_notifications', 'order_confirmations')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-delivery-updates">Delivery Updates</Label>
              <p className="text-sm text-muted-foreground">
                SMS notifications for delivery status changes
              </p>
            </div>
            <Switch
              id="sms-delivery-updates"
              checked={preferences.sms_notifications.delivery_updates}
              onCheckedChange={() => handleToggle('sms_notifications', 'delivery_updates')}
            />
          </div>

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
              <Label htmlFor="push-enabled">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow the browser to show notifications
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.push_notifications.enabled}
              onCheckedChange={() => handleToggle('push_notifications', 'enabled')}
            />
          </div>

          {preferences.push_notifications.enabled && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-order-updates">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about order status changes
                  </p>
                </div>
                <Switch
                  id="push-order-updates"
                  checked={preferences.push_notifications.order_updates}
                  onCheckedChange={() => handleToggle('push_notifications', 'order_updates')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-inventory-alerts">Inventory Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Low stock and inventory warnings
                  </p>
                </div>
                <Switch
                  id="push-inventory-alerts"
                  checked={preferences.push_notifications.inventory_alerts}
                  onCheckedChange={() => handleToggle('push_notifications', 'inventory_alerts')}
                />
              </div>
            </>
          )}

          {!preferences.push_notifications.enabled && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Enable push notifications to receive real-time updates in your browser.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Notification Frequency */}
      <SettingsCard
        title="Notification Frequency"
        description="Control how often you receive notifications"
        icon={Smartphone}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📧 <strong>Email Digest:</strong> Receive a daily summary of all notifications instead of individual emails (coming soon)
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              ⏰ <strong>Quiet Hours:</strong> Set specific times when you don&apos;t want to receive notifications (coming soon)
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          Reset to Defaults
        </Button>

        <Button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
        >
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