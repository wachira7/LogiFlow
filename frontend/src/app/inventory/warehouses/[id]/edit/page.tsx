// src/app/inventory/warehouses/[id]/edit/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useWarehouse } from '@/hooks/useInventory'
import { WarehouseForm } from '@/components/inventory/warehouses/WarehouseForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Warehouse } from 'lucide-react'
import Link from 'next/link'

export default function EditWarehousePage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params?.id as string
  const { warehouse, isLoading } = useWarehouse(warehouseId)

  const handleSuccess = () => {
    // Navigate back to warehouse detail page after successful update
    router.push(`/inventory/warehouses/${warehouseId}`)
  }

  const handleCancel = () => {
    // Navigate back to warehouse detail page
    router.push(`/inventory/warehouses/${warehouseId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Warehouse className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Warehouse not found</h2>
          <p className="text-muted-foreground">The warehouse you&apos;re trying to edit doesn&apos;t exist.</p>
        </div>
        <Link href="/inventory/warehouses">
          <Button>Back to Warehouses</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href={`/inventory/warehouses/${warehouseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Warehouse</h1>
          <p className="text-muted-foreground">Update {warehouse.name} details</p>
        </div>
      </div>

      {/* Warehouse Form */}
      <WarehouseForm
        warehouseId={warehouseId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}