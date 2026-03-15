// app/settings/security/page.tsx
'use client'

import { SecuritySettingsForm } from '@/components/settings/SecuritySettingsForm'

export default function SecuritySettingsPage() {
  return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Security Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your password, authentication, and security preferences
          </p>
        </div>
        
        <SecuritySettingsForm />
      </div>
  )
}
