// src/app/warehousing/layout.tsx
'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
interface WarehousingLayoutProps {
  children: ReactNode
}

export default function WarehousingLayout({ children }: WarehousingLayoutProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-2">
         <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      {children}
    </div>
  )
}