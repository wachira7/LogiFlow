// src/app/inventory/warehouses/new/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WarehouseForm } from '@/components/inventory/warehouses/WarehouseForm'

export default function NewWarehousePage() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/inventory/warehouses">
          <Button variant="ghost" size="icon" aria-label="Back to warehouses">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Warehouse</h1>
          <p className="text-muted-foreground">Create a new warehouse location</p>
        </div>
      </div>
      <WarehouseForm
        onSuccess={() => router.push('/inventory/warehouses')}
        onCancel={() => router.push('/inventory/warehouses')}
      />
    </div>
  )
}
