// src/app/production/orders/[id]/page.tsx
'use client'

import { use } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionOrderDetail } from '@/components/production/ProductionOrderDetail'

export default function ProductionOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  return (
    <ErrorBoundary>
      <ProductionOrderDetail orderId={id} />
    </ErrorBoundary>
  )
}
