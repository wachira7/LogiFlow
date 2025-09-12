//src/app/inventory/layout.tsx
import { ReactNode } from 'react'

interface InventoryLayoutProps {
  children: ReactNode
}

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}