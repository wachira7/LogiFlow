// src/app/production/materials/page.tsx
'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MaterialsList } from '@/components/production/MaterialsList'

export default function ProductionMaterialsPage() {
  return (
    <ErrorBoundary>
      <MaterialsList />
    </ErrorBoundary>
  )
}
