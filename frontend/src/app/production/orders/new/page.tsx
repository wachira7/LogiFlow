// src/app/production/orders/new/page.tsx
'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionOrderForm } from '@/components/production/ProductionOrderForm'

export default function NewProductionOrderPage() {
  return (
    <ErrorBoundary>
      <ProductionOrderForm />
    </ErrorBoundary>
  )
}
