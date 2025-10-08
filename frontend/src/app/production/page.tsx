// src/app/production/page.tsx
'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionDashboard } from '@/components/production/ProductionDashboard'

export default function ProductionPage() {
  return (
    <ErrorBoundary>
      <ProductionDashboard />
    </ErrorBoundary>
  )
}
