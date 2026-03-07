// src/components/production/MaterialsList.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionMaterials } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Package, AlertTriangle, CheckCircle } from 'lucide-react'

export function MaterialsList() {
  const router = useRouter()
  const {
    materials = [],
    insufficientStock,
    loading,
    fetchMaterials,
    fetchInsufficientStock
  } = useProductionMaterials()

  const [searchQuery, setSearchQuery] = useState('')

  const loadMaterials = useCallback(async () => {
    await Promise.all([
      fetchMaterials(),
      fetchInsufficientStock()
    ])
  }, [fetchMaterials, fetchInsufficientStock])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  const handleSearch = async () => {
    const filters = searchQuery ? { search: searchQuery } : undefined
    await fetchMaterials(filters)
  }

  const filteredMaterials = materials.filter(material =>
    material.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.product_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production Materials</h2>
          <p className="text-muted-foreground">
            Monitor material requirements and stock availability
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Materials</p>
                <p className="text-3xl font-bold">{materials.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sufficient Stock</p>
                <p className="text-3xl font-bold text-green-600">
                  {materials.filter(m => m.sufficient_stock).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Insufficient Stock</p>
                <p className="text-3xl font-bold text-red-600">
                  {insufficientStock?.total_count || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insufficient Stock Alert */}
      {insufficientStock && insufficientStock.total_count > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Stock Shortage Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              {insufficientStock.total_count} material(s) have insufficient stock to meet production requirements.
              Production orders may be delayed until stock is replenished.
            </p>
            <div className="space-y-2">
              {insufficientStock.materials_with_insufficient_stock?.slice(0, 3).map((material) => (
                <div key={material.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{material.product_name} ({material.product_sku})</span>
                  <Badge variant="destructive">
                    Short by {material.shortage}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, SKU, or warehouse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production Materials ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No materials found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Materials will appear here when production orders are created'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Production Order</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Required Qty</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.product_name}</TableCell>
                      <TableCell>{material.product_sku}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal"
                          onClick={() => router.push(`/production/orders/${material.production_order_id}`)}
                        >
                          View Order
                        </Button>
                      </TableCell>
                      <TableCell>{material.warehouse_name}</TableCell>
                      <TableCell>{material.quantity}</TableCell>
                      <TableCell>
                        <span className={material.sufficient_stock ? '' : 'text-red-600 font-semibold'}>
                          {material.available_stock}
                        </span>
                      </TableCell>
                      <TableCell>${(material.unit_cost ?? 0).toFixed(2)}</TableCell>
                      <TableCell>${(material.material_cost ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {material.sufficient_stock ? (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sufficient
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Insufficient
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}