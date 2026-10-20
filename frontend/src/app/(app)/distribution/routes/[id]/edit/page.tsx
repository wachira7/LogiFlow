// src/app/(app)/distribution/routes/[id]/edit/page.tsx
'use client'

import { use } from 'react'
import { RouteForm } from '@/components/distribution/RouteForm'

export default function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RouteForm routeId={id} />
}
