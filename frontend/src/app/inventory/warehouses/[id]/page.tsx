// /app/inventory/warehouses/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWarehouse } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Edit, Building, MapPin, User, Package } from 'lucide-react'

export default function WarehouseDetailPage() {
  const params = useParams()
  const warehouseId = params?.id as string
  const { warehouse, inventory, isLoading } = useWarehouse(warehouseId)

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
        <Building className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Warehouse not found</h2>
          <p className="text-muted-foreground">The warehouse you&apos;re looking for doesn&apos;t exist.</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory/warehouses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{warehouse.name}</h1>
            <p className="text-muted-foreground">Warehouse Details</p>
          </div>
        </div>
        <Link href={`/inventory/warehouses/${warehouse.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Warehouse
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Warehouse Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="mt-1 font-medium">{warehouse.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Code</label>
                  <p className="mt-1 font-mono text-sm">{warehouse.code}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="mt-1 flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p>{warehouse.address}</p>
                  </div>
                </div>
              </div>
              {warehouse.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{warehouse.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manager Information */}
          {(warehouse.manager_name || warehouse.manager_email) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Manager Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {warehouse.manager_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="mt-1">{warehouse.manager_name}</p>
                  </div>
                )}
                {warehouse.manager_email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1">{warehouse.manager_email}</p>
                  </div>
                )}
                {warehouse.manager_phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="mt-1">{warehouse.manager_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                    {warehouse.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Products</label>
                <div className="mt-1 flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">{warehouse.total_products || 0}</span>
                </div>
              </div>
              {warehouse.utilization_percentage !== undefined && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Utilization</label>
                  <div className="mt-1 space-y-2">
                    <Progress value={warehouse.utilization_percentage} className="h-2" />
                    <span className="text-sm text-muted-foreground">
                      {warehouse.utilization_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="mt-1 text-sm">{new Date(warehouse.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1 text-sm">{new Date(warehouse.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Items */}
      {inventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{item.product?.name}</div>
                  <div className="text-sm text-muted-foreground">{item.product?.sku}</div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-lg font-semibold">{item.quantity}</span>
                    <span className="text-sm text-muted-foreground">{item.product?.unit_of_measure}</span>
                  </div>
                </div>
              ))}
            </div>
            {inventory.length > 6 && (
              <div className="mt-4 text-center">
                <Link href={`/inventory/inventory-items?warehouse=${warehouse.id}`}>
                  <Button variant="outline" size="sm">
                    View all {inventory.length} items
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
