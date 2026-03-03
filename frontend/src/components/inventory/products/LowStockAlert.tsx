// src/components/inventory/products/LowStockAlert.tsx
'use client'

import Link from 'next/link'
import { useInventoryDashboard } from '@/hooks/useInventory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AlertTriangle, Eye, ShoppingCart } from 'lucide-react'

interface LowStockAlertProps {
  limit?: number
  showViewAll?: boolean
  compact?: boolean
}

export function LowStockAlert({ limit = 10, showViewAll = true, compact = false }: LowStockAlertProps) {
  const { lowStockProducts, isLoading } = useInventoryDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24">
        <LoadingSpinner />
      </div>
    )
  }

  const products = lowStockProducts.slice(0, limit)

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-green-600" />
          </div>
          <p className="font-medium text-green-700">All stock levels are healthy</p>
          <p className="text-sm text-muted-foreground mt-1">No products require immediate restocking</p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive" className="text-xs">
                {product.total_stock ?? 0} left
              </Badge>
              <Link href={`/inventory/products/${product.id}`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
        {showViewAll && lowStockProducts.length > limit && (
          <Link href="/inventory/reports">
            <Button variant="outline" size="sm" className="w-full">
              View all {lowStockProducts.length} low stock items
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Low Stock Alert</span>
            </CardTitle>
            <CardDescription>
              {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} need restocking
            </CardDescription>
          </div>
          {showViewAll && (
            <Link href="/inventory/reports">
              <Button variant="outline" size="sm">View Report</Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Reorder Point</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const stock = product.total_stock ?? 0
              const isOut = stock === 0
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell>{product.category?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={isOut ? 'destructive' : 'secondary'}>
                      {stock} {product.unit_of_measure || 'units'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.reorder_point ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link href={`/inventory/products/${product.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/inventory/inventory-items/new?product_id=${product.id}`}>
                        <Button variant="outline" size="sm">
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          Restock
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}