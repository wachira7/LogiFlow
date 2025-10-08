// src/app/production/layout.tsx
'use client'

import { ReactNode } from 'react'

interface ProductionLayoutProps {
  children: ReactNode
}

export default function ProductionLayout({ children }: ProductionLayoutProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {children}
    </div>
  )
}