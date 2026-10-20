// src/app/(app)/inventory/categories/new/page.tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CategoryForm } from '@/components/inventory/CategoryForm'

function NewCategory() {
  const params = useSearchParams()
  return <CategoryForm parentId={params.get('parent_id') ?? undefined} />
}

export default function Page() {
  return <Suspense><NewCategory /></Suspense>
}
