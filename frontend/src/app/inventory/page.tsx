// /app/inventory/page.tsx
'use client'

import Link from 'next/link'
import { useInventoryDashboard } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  FolderTree, 
  Building, 
  AlertTriangle, 
  TrendingUp,
  Plus,
  Eye,
  BarChart3
} from 'lucide-react'

export default function InventoryPage() {
  const { stats, lowStockProducts, isLoading } = useInventoryDashboard()

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
          <p className="text-muted-foreground">
            Monitor your inventory status and manage stock levels
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_categories || 0}</div>
            <p className="text-xs text-muted-foreground">
              Product categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_warehouses || 0}</div>
            <p className="text-xs text-muted-foreground">
              Storage locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.low_stock_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common inventory management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/inventory/products/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Plus className="h-6 w-6" />
                <span>Add Product</span>
              </Button>
            </Link>
            <Link href="/inventory/categories/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <FolderTree className="h-6 w-6" />
                <span>Add Category</span>
              </Button>
            </Link>
            <Link href="/inventory/warehouses/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Building className="h-6 w-6" />
                <span>Add Warehouse</span>
              </Button>
            </Link>
            <Link href="/inventory/inventory-items/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Package className="h-6 w-6" />
                <span>Add Stock</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Low Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Low Stock Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well-stocked</p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {product.current_stock || 0} {product.unit_of_measure}
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <Link href="/inventory/products?low_stock=true">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all {lowStockProducts.length} items
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/inventory/products">
              <Button variant="ghost" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Products
              </Button>
            </Link>
            <Link href="/inventory/categories">
              <Button variant="ghost" className="w-full justify-start">
                <FolderTree className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Link href="/inventory/warehouses">
              <Button variant="ghost" className="w-full justify-start">
                <Building className="mr-2 h-4 w-4" />
                Warehouses
              </Button>
            </Link>
            <Link href="/inventory/inventory-items">
              <Button variant="ghost" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" />
                Stock Levels
              </Button>
            </Link>
            <Link href="/inventory/transactions">
              <Button variant="ghost" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Transactions
              </Button>
            </Link>
            <Link href="/inventory/reports">
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}