// /app/inventory/inventory-items/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useInventoryItems } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Package, AlertTriangle } from 'lucide-react'

export default function InventoryItemDetailPage() {
  const params = useParams()
  const itemId = params?.id as string
  const { inventoryItems, isLoading } = useInventoryItems()
  
  const item = inventoryItems.find(i => i.id === itemId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Inventory item not found</h2>
          <p className="text-muted-foreground">The inventory item you&apos;re looking for doesn&apos;t exist.</p>
        </div>
        <Link href="/inventory/inventory-items">
          <Button>Back to Inventory Items</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory/inventory-items">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.product?.name}</h1>
            <p className="text-muted-foreground">Inventory Item Details</p>
          </div>
        </div>
        <Link href={`/inventory/inventory-items/${item.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Adjust Stock
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Item Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                  <p className="mt-1 font-medium">{item.product?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="mt-1 font-mono text-sm">{item.product?.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="mt-1">{item.product?.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                  <p className="mt-1">{item.product?.unit_of_measure}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warehouse Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                  <p className="mt-1 font-medium">{item.warehouse?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse Code</label>
                  <p className="mt-1 font-mono text-sm">{item.warehouse?.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="mt-1">{item.location || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="mt-1 text-sm">{item.warehouse?.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch & Expiry Info */}
          {(item.batch_number || item.expiration_date) && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {item.batch_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Batch Number</label>
                      <p className="mt-1 font-mono text-sm">{item.batch_number}</p>
                    </div>
                  )}
                  {item.expiration_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expiration Date</label>
                      <p className="mt-1">{new Date(item.expiration_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stock Info & Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Quantity</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-3xl font-bold">{item.quantity}</span>
                  <span className="text-muted-foreground">{item.product?.unit_of_measure}</span>
                  {item.quantity === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Out of Stock
                    </Badge>
                  )}
                  {item.product?.low_stock && item.quantity > 0 && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>

              {item.reserved_quantity !== undefined && item.reserved_quantity > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reserved Quantity</label>
                  <p className="mt-1 text-lg font-semibold text-orange-600">
                    {item.reserved_quantity} {item.product?.unit_of_measure}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Available Quantity</label>
                <p className="mt-1 text-lg font-semibold text-green-600">
                  {item.available_quantity || (item.quantity - (item.reserved_quantity || 0))} {item.product?.unit_of_measure}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Reorder Level</label>
                <p className="mt-1">{item.product?.reorder_level || 0} {item.product?.unit_of_measure}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="mt-1 text-sm">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1 text-sm">{new Date(item.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}