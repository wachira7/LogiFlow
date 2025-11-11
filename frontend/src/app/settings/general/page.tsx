// app/settings/general/page.tsx
'use client'

import { PrivateRoute } from '@/components/auth/AuthGuard'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'

export default function GeneralSettingsPage() {
  return (
    <PrivateRoute>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">General Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your profile information and preferences
          </p>
        </div>
        
        <GeneralSettingsForm />
      </div>
    </PrivateRoute>
  )
}
