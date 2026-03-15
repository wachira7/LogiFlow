// app/settings/integrations/page.tsx
'use client'

import { IntegrationsList } from '@/components/settings/IntegrationsList'

export default function IntegrationsSettingsPage() {
  return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground mt-1">
            Connect LogiFlow with your favorite tools and services
          </p>
        </div>
        
        <IntegrationsList />
      </div>
    
  )
}
