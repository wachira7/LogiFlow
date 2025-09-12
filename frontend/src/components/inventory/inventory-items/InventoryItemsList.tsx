// /src/components/inventory/inventory-items/InventoryItemsList.tsx
'use client'

import { useState } from 'react'
import { useInventoryItems } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Package,
  Eye,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { InventoryFilters } from '../shared/InventoryFilters'
import { StockLevelIndicator } from './StockLevelIndicator'
import { InventoryItem } from '@/types/inventory.types'

export function InventoryItemsList() {
  const { inventoryItems, isLoading, deleteInventoryItem } = useInventoryItems()
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    warehouse_id: '',
    stock_status: '',
    is_active: '',
    unit_of_measure: ''
  })

  const filteredItems = inventoryItems.filter(item => {
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.sku.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.category_id && item.category_id !== filters.category_id) return false
    if (filters.warehouse_id && item.warehouse_id !== filters.warehouse_id) return false
    if (filters.is_active && item.is_active.toString() !== filters.is_active) return false
    if (filters.unit_of_measure && item.unit_of_measure !== filters.unit_of_measure) return false
    
    // Stock status filtering
    if (filters.stock_status) {
      const stockStatus = getStockStatus(item)
      if (stockStatus !== filters.stock_status) return false
    }
    
    return true
  })

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'out_of_stock'
    if (item.reorder_point && item.current_stock <= item.reorder_point) return 'low_stock'
    if (item.maximum_stock && item.current_stock >= item.maximum_stock) return 'overstocked'
    return 'in_stock'
  }

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await deleteInventoryItem(itemId)
      } catch (error) {
        console.error('Failed to delete inventory item:', error)
      }
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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
          <p className="text-muted-foreground">Manage your inventory stock levels</p>
        </div>
        <Link href="/inventory/inventory-items/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <InventoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        showStockStatus={true}
        showWarehouse={true}
        showUnitFilter={true}
      />

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Items ({filteredItems.length})</span>
            <Package className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
              title="No inventory items found"
              description={filters.search || filters.category_id || filters.warehouse_id ? 
                "No items match your current filters." : 
                "Get started by adding your first inventory item."}
              action={
                <Link href="/inventory/inventory-items/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      {item.category?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <StockLevelIndicator
                        currentStock={item.current_stock}
                        minimumStock={item.minimum_stock}
                        maximumStock={item.maximum_stock}
                        reorderPoint={item.reorder_point}
                        variant="badge"
                        showNumbers={false}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.current_stock}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.unit_of_measure}
                        </span>
                        {item.reorder_point && item.current_stock <= item.reorder_point && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          Cost: {formatCurrency(item.cost_price as number | null)}
                        </div>
                        <div className="text-sm">
                          Sell: {formatCurrency(item.selling_price as number | null)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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