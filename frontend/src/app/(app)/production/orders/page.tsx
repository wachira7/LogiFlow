// src/app/(app)/production/orders/page.tsx
'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TableSkeleton } from '@/components/app/kit'
import { ProductionOrderList } from '@/components/production/ProductionOrderList'

export default function ProductionOrdersPage() {
  // The list reads ?status= from the URL
  return (
    <ErrorBoundary>
      <Suspense fallback={<TableSkeleton />}>
        <ProductionOrderList />
      </Suspense>
    </ErrorBoundary>
  )
}
