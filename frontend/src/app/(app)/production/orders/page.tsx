// src/app/production/orders/page.tsx
'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionOrderList } from '@/components/production/ProductionOrderList'

export default function ProductionOrdersPage() {
  return (
    <ErrorBoundary>
      <ProductionOrderList />
    </ErrorBoundary>
  )
}
