// src/app/(app)/distribution/orders/[id]/edit/page.tsx
'use client'

import { use } from 'react'
import { OrderForm } from '@/components/distribution/OrderForm'

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <OrderForm orderId={id} />
}
