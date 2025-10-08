// src/app/production/orders/[id]/edit/page.tsx
'use client'

import { use } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProductionOrderForm } from '@/components/production/ProductionOrderForm'

export default function EditProductionOrderPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  return (
    <ErrorBoundary>
      <ProductionOrderForm orderId={id} isEdit={true} />
    </ErrorBoundary>
  )
}