// /src/components/inventory/products/ProductList.tsx
'use client'

import { useState } from 'react'
import { useProducts } from '@/hooks/useInventory'
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
  Package2,
  Eye,
  AlertTriangle,
  TrendingDown
} from 'lucide-react'
import Link from 'next/link'
import { InventoryFilters } from '../shared/InventoryFilters'
import { Product } from '@/types/inventory.types' // Add missing import

export function ProductList() {
  const { products, isLoading, deleteProduct } = useProducts()
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    warehouse_id: '',
    stock_status: '',
    is_active: '',
    unit_of_measure: ''
  })

  const filteredProducts = products.filter(product => {
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !product.sku.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.category_id && product.category_id !== filters.category_id) return false
    if (filters.is_active && product.is_active.toString() !== filters.is_active) return false
    
    // Stock status filtering for products
    if (filters.stock_status) {
      const stockStatus = getProductStockStatus(product)
      if (stockStatus !== filters.stock_status) return false
    }
    
    return true
  })

  const getProductStockStatus = (product: Product) => { // Fix: Change from 'any' to 'Product'
    if (!product.track_stock) return 'in_stock' // If not tracking stock, assume in stock
    if (product.total_stock === undefined) return 'out_of_stock'
    if (product.reorder_point && product.total_stock <= product.reorder_point) return 'low_stock'
    if (product.maximum_stock && product.total_stock >= product.maximum_stock) return 'overstocked'
    return 'in_stock'
  }

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId)
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  const formatCurrency = (amount: number | undefined) => { // Fix: Change from 'number | null' to 'number | undefined'
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStockBadgeVariant = (product: Product) => { // Fix: Change from 'any' to 'Product'
    if (!product.track_stock) return 'outline'
    const status = getProductStockStatus(product)
    switch (status) {
      case 'out_of_stock': return 'destructive'
      case 'low_stock': return 'destructive'
      case 'overstocked': return 'secondary'
      default: return 'default'
    }
  }

  const getStockDisplay = (product: Product) => {
    if (!product.track_stock) return 'Not Tracked'
    const status = getProductStockStatus(product)
    switch (status) {
      case 'out_of_stock': return 'Out of Stock'
      case 'low_stock': return 'Low Stock'
      case 'overstocked': return 'Overstocked'
      default: return 'In Stock'
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
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link href="/inventory/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <InventoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        showStockStatus={true}
        showWarehouse={false}
        showUnitFilter={false}
      />

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Products ({filteredProducts.length})</span>
            <Package2 className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package2 className="h-12 w-12 text-muted-foreground" />} 
              title="No products found"
              description={filters.search || filters.category_id ? 
                "No products match your current filters." : 
                "Get started by adding your first product."}
              action={
                <Link href="/inventory/products/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
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
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      {product.category?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStockBadgeVariant(product)}>
                        {getStockDisplay(product)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.track_stock ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{product.total_stock || 0}</span>
                          {product.reorder_point && (product.total_stock || 0) <= product.reorder_point && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          {(product.total_stock || 0) === 0 && (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not tracked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          Cost: {formatCurrency(product.cost_price)}
                        </div>
                        <div className="text-sm">
                          Sell: {formatCurrency(product.unit_price)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? 'Active' : 'Inactive'}
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
                            <Link href={`/inventory/products/${product.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/products/${product.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(product.id)}
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