//src/app/inventory/inventory-items/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useInventoryItems, useProducts, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Package, AlertTriangle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InventoryItemFilter } from '@/types/inventory.types'

export default function InventoryItemsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filter, setFilter] = useState<InventoryItemFilter>({})

  const { inventoryItems, isLoading, pagination, applyFilter, deleteInventoryItem } = useInventoryItems(filter)
  const { products } = useProducts()
  const { warehouses } = useWarehouses()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    applyFilter({ ...filter, search: query })
  }

  const handleFilterChange = (key: keyof InventoryItemFilter, value: unknown) => {
    const newFilter = { ...filter, [key]: value }
    setFilter(newFilter)
    applyFilter(newFilter)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await deleteInventoryItem(id)
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockItems = inventoryItems.filter(item => item.product?.low_stock)
  const outOfStockItems = inventoryItems.filter(item => item.quantity === 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory across all warehouses
          </p>
        </div>
        <Link href="/inventory/inventory-items/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Stock
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <Select
                value={filter.product || ''}
                onValueChange={(value) => handleFilterChange('product', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.warehouse || ''}
                onValueChange={(value) => handleFilterChange('warehouse', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('low_stock', !filter.low_stock)}
                  className={filter.low_stock ? 'bg-orange-50 border-orange-200' : ''}
                >
                  Low Stock
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Inventory Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Track stock levels for each product in each warehouse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <EmptyState
              title="No inventory items found"
              description="Start tracking stock by adding inventory items to your warehouses"
              action={
                <Link href="/inventory/inventory-items/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock
                  </Button>
                </Link>
              }
              icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Batch/Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {item.product?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.warehouse?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.warehouse?.code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {item.location || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.quantity}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.product?.unit_of_measure}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.reserved_quantity || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {item.available_quantity || item.quantity}
                          </span>
                          {item.quantity === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Out
                            </Badge>
                          )}
                          {item.product?.low_stock && item.quantity > 0 && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.batch_number && (
                            <div>Batch: {item.batch_number}</div>
                          )}
                          {item.expiration_date && (
                            <div className="text-muted-foreground">
                              Exp: {new Date(item.expiration_date).toLocaleDateString()}
                            </div>
                          )}
                          {!item.batch_number && !item.expiration_date && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : item.product?.low_stock ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/inventory-items/${item.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/inventory-items/${item.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Adjust Stock
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.count > pagination.page_size && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                    {Math.min(pagination.page * pagination.page_size, pagination.count)} of{' '}
                    {pagination.count} items
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.previous}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}