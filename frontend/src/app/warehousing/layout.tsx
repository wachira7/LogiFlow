// src/app/warehousing/layout.tsx
'use client'

import { ReactNode } from 'react'

interface WarehousingLayoutProps {
  children: ReactNode
}

export default function WarehousingLayout({ children }: WarehousingLayoutProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {children}
    </div>
  )
}