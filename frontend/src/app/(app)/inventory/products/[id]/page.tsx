// src/app/inventory/products/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useProduct } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Package, AlertTriangle } from 'lucide-react'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params?.id as string
  const { product, isLoading } = useProduct(productId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Product not found</h2>
          <p className="text-muted-foreground">The product you&apos;re looking for doesn&apos;t exist.</p>
        </div>
        <Link href="/inventory/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">Product Details</p>
          </div>
        </div>
        <Link href={`/inventory/products/${product.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Product Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="mt-1 font-medium">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="mt-1 font-mono text-sm">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="mt-1">{product.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                  <p className="mt-1">{product.unit_of_measure}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reorder Point</label>
                  <p className="mt-1">{product.reorder_point ?? '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock Levels</label>
                  <p className="mt-1">{product.min_stock_level ?? '-'} – {product.max_stock_level ?? '-'}</p>
                </div>
              </div>
              {product.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status & Stock Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Status</label>
                <div className="mt-1">
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-2xl font-bold">{product.total_stock ?? 0}</span>
                  <span className="text-muted-foreground">{product.unit_of_measure}</span>
                  {product.needs_reorder && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>
              {!!product.total_stock && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock value (at cost)</label>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {(Number(product.total_stock) * Number(product.cost_price ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
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
                <p className="mt-1 text-sm">{new Date(product.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1 text-sm">{new Date(product.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}