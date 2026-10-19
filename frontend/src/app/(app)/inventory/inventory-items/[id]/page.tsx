// src/app/inventory/inventory-items/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { inventoryService } from '@/services/inventoryService'
import type { InventoryItem } from '@/types/inventory.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Package, AlertTriangle } from 'lucide-react'

export default function InventoryItemDetailPage() {
  const params = useParams()
  const itemId = params?.id as string
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    inventoryService.getInventoryItem(itemId).then((res) => {
      setItem(res.success && res.data ? res.data : null)
      setIsLoading(false)
    })
  }, [itemId])

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
            <h1 className="text-3xl font-bold tracking-tight">{item.product_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{item.product_sku}</p>
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
        {/* Left — main info */}
        <div className="md:col-span-2 space-y-6">

          {/* Warehouse Info */}
          <Card>
            <CardHeader>
              <CardTitle>Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse Name</label>
                  <p className="mt-1 font-medium">{item.warehouse_name}</p>
                </div>
                {item.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bin / Shelf Location</label>
                    <p className="mt-1">{item.location}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                  <p className="mt-1 font-medium">
                    {Number(item.product_cost_price ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                  <p className="mt-1 font-medium">
                    {Number(item.product_unit_price ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock Value</label>
                  <p className="mt-1 font-semibold text-green-700">
                    ${(item.stock_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
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
              {item.last_checked && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Stock Check</label>
                  <p className="mt-1 text-sm">{new Date(item.last_checked).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — stock info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current quantity */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Quantity</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-3xl font-bold">{item.quantity}</span>
                  {item.quantity === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Out of Stock
                    </Badge>
                  )}
                  {item.needs_reorder && item.quantity > 0 && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>

              {/* Reorder point */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reorder Point</label>
                <p className="mt-1 font-medium">{item.reorder_point}</p>
              </div>

              {/* Status badge */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  {item.quantity === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : item.needs_reorder ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      In Stock
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}