// app/settings/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to general settings by default
    router.push('/settings/general')
  }, [router])

  return null
}
