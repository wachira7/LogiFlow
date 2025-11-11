// app/settings/notifications/page.tsx
'use client'

import { PrivateRoute } from '@/components/auth/AuthGuard'
import { NotificationPreferences } from '@/components/settings/NotificationPreferences'

export default function NotificationsSettingsPage() {
  return (
    <PrivateRoute>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground mt-1">
            Control how and when you receive notifications
          </p>
        </div>
        
        <NotificationPreferences />
      </div>
    </PrivateRoute>
  )
}