// src/app/(app)/inventory/products/[id]/edit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/inventory/ProductForm'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <ProductForm productId={id} />
}
