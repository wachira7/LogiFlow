// /src/components/inventory/products/ProductDetails.tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Edit, Package, AlertTriangle, Building, TrendingUp, BarChart3 } from 'lucide-react'
import type { Product } from '@/types/inventory.types'

interface ProductDetailsProps {
  product: Product
  showActions?: boolean
}

export function ProductDetails({ product, showActions = true }: ProductDetailsProps) {
  const formatCurrency = (val?: number) =>
    val != null ? `$${Number(val).toFixed(2)}` : '—'

  const stockStatus = () => {
    const stock = product.total_stock ?? 0
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (product.needs_reorder) return { label: 'Low Stock', variant: 'secondary' as const }
    return { label: 'In Stock', variant: 'default' as const }
  }

  const status = stockStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{product.sku}</p>
        </div>
        {showActions && (
          <Link href={`/inventory/products/${product.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Product Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="mt-1 font-medium">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU</p>
                  <p className="mt-1 font-mono text-sm">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="mt-1">{product.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit of Measure</p>
                  <p className="mt-1">{product.unit_of_measure || '—'}</p>
                </div>
                {product.barcode && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                    <p className="mt-1 font-mono text-sm">{product.barcode}</p>
                  </div>
                )}
                {product.lead_time_days != null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lead Time</p>
                    <p className="mt-1">{product.lead_time_days} days</p>
                  </div>
                )}
              </div>
              {product.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm">{product.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Pricing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost Price</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(product.cost_price)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit Price</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(product.unit_price)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                  <p className="mt-1 text-lg font-semibold text-green-600">
                    {product.profit_margin != null ? `${Number(product.profit_margin).toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock by Warehouse */}
          {product.stock_by_warehouse && product.stock_by_warehouse.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Stock by Warehouse</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.stock_by_warehouse.map((item) => (
                    <div key={item.warehouse_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{item.warehouse_name}</p>
                        {item.location && (
                          <p className="text-xs text-muted-foreground">Location: {item.location}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-base px-3">
                        {item.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Product Status</p>
                <div className="mt-1">
                  <Badge variant={product.is_active ? 'default' : 'secondary'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Status</p>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                <p className="mt-1 text-2xl font-bold">{product.total_stock ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stock Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Stock Levels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Min Stock</span>
                <span className="font-medium">{product.min_stock_level ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Stock</span>
                <span className="font-medium">{product.max_stock_level ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reorder Point</span>
                <span className="font-medium">{product.reorder_point ?? '—'}</span>
              </div>
              {product.needs_reorder && (
                <div className="flex items-center space-x-2 mt-2 p-2 bg-orange-50 rounded text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">Reorder needed</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader><CardTitle>Timestamps</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="mt-1 text-sm">{new Date(product.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="mt-1 text-sm">{new Date(product.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}