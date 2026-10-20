// src/app/production/steps/page.tsx
'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionSteps } from '@/components/production/ProductionSteps'

export default function ProductionStepsPage() {
  return (
    <ErrorBoundary>
      <ProductionSteps />
    </ErrorBoundary>
  )
}