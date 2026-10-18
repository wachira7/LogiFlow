// src/components/inventory/inventory-items/InventoryItemsList.tsx
'use client'

import { useState } from 'react'
import { useInventoryItems } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, MoreHorizontal, Edit, Trash2, Package, Eye, AlertTriangle, Search } from 'lucide-react'
import Link from 'next/link'
import { useWarehouses } from '@/hooks/useInventory'

export function InventoryItemsList() {
  const { inventoryItems, isLoading, deleteInventoryItem, applyFilter } = useInventoryItems()
  const { warehouses } = useWarehouses()

  const [searchQuery, setSearchQuery] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  const handleSearch = () => {
    applyFilter({
      ...(searchQuery && { search: searchQuery }),
      ...(warehouseFilter && { warehouse: warehouseFilter }),
    })
  }

  const handleWarehouseChange = (value: string) => {
    setWarehouseFilter(value)
    applyFilter({
      ...(searchQuery && { search: searchQuery }),
      ...(value && { warehouse: value }),
    })
  }

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to remove this inventory item?')) {
      try {
        await deleteInventoryItem(itemId)
      } catch (error) {
        console.error('Failed to delete inventory item:', error)
      }
    }
  }

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
          <h2 className="text-2xl font-bold">Inventory Items</h2>
          <p className="text-muted-foreground">Stock levels per product per warehouse</p>
        </div>
        <Link href="/inventory/inventory-items/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={warehouseFilter} onValueChange={handleWarehouseChange}>
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
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Items ({inventoryItems.length})</span>
            <Package className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <EmptyState
              icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
              title="No inventory items found"
              description="Get started by adding stock for a product in a warehouse."
              action={
                <Link href="/inventory/inventory-items/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.product_sku}</TableCell>
                    <TableCell>{item.warehouse_name}</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.quantity}</span>
                        {item.needs_reorder && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.reorder_point}</TableCell>
                    <TableCell>
                      {Number(item.product_cost_price ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${(item.stock_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/inventory-items/${item.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/inventory-items/${item.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Adjust Stock
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}