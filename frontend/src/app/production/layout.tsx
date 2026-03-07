// src/app/production/layout.tsx
'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'


interface ProductionLayoutProps {
  children: ReactNode
}

export default function ProductionLayout({ children }: ProductionLayoutProps) {
   return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-3 w-3" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}