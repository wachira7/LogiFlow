// src/app/production/materials/[id]/page.tsx
'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MaterialDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to materials list - individual material pages not implemented
    router.push('/production/materials')
  }, [router, id])

  return null
}