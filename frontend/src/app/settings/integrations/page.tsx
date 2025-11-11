// app/settings/integrations/page.tsx
'use client'

import { PrivateRoute } from '@/components/auth/AuthGuard'
import { IntegrationsList } from '@/components/settings/IntegrationsList'

export default function IntegrationsSettingsPage() {
  return (
    <PrivateRoute>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground mt-1">
            Connect LogiFlow with your favorite tools and services
          </p>
        </div>
        
        <IntegrationsList />
      </div>
    </PrivateRoute>
  )
}
