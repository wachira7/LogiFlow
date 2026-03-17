// app/dashboard/reports/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardAnalyticsPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/analytics')
  }, [router])

  return null
}