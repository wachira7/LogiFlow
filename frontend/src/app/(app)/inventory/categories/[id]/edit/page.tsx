// src/app/(app)/inventory/categories/[id]/edit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { CategoryForm } from '@/components/inventory/CategoryForm'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <CategoryForm categoryId={id} />
}
