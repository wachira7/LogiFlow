// src/app/production/materials/new/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewMaterialPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to create production order - materials are added there
    router.push('/production/orders/new')
  }, [router])

  return null
}