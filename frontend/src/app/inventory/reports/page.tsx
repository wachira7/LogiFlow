'use client'

import { useState } from 'react'
import { useInventoryDashboard, useProducts, useCategories, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  Building,
  FolderTree
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ReportsPage() {
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  const { stats, lowStockProducts, isLoading } = useInventoryDashboard()
  const { products } = useProducts()
  const { categories } = useCategories()
  const { warehouses } = useWarehouses()

  const handleExport = async (reportType: string) => {
    setExportLoading(reportType)
    // Simulate export delay
    setTimeout(() => {
      setExportLoading(null)
      // In real implementation, trigger download here
      console.log(`Exporting ${reportType} report...`)
    }, 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  const activeProducts = products.filter(p => p.is_active)
  const inactiveProducts = products.filter(p => !p.is_active)
  const outOfStockProducts = products.filter(p => p.current_stock === 0)
  
  const categoriesWithProducts = categories.map(category => ({
    ...category,
    productCount: products.filter(p => p.category_id === category.id).length
  })).sort((a, b) => b.productCount - a.productCount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and reports for your inventory
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('inventory')}
            disabled={exportLoading === 'inventory'}
          >
            {exportLoading === 'inventory' ? (
              <LoadingSpinner />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export All
          </Button>
        </div>
      </div>

      {/* Summary Stats - FIXED */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeProducts.length} active, {inactiveProducts.length} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Products with zero stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock Analysis</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Stock Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Low Stock Alert</span>
                </CardTitle>
                <CardDescription>
                  Products that need immediate restocking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No low stock items</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lowStockProducts.slice(0, 10).map((product) => (
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
                    {lowStockProducts.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{lowStockProducts.length - 10} more items
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Quick Reports</span>
                </CardTitle>
                <CardDescription>
                  Generate and export common reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleExport('low-stock')}
                  disabled={exportLoading === 'low-stock'}
                >
                  {exportLoading === 'low-stock' ? (
                    <LoadingSpinner />
                  ) : (
                    <AlertTriangle className="mr-2 h-4 w-4" />
                  )}
                  Low Stock Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleExport('stock-valuation')}
                  disabled={exportLoading === 'stock-valuation'}
                >
                  {exportLoading === 'stock-valuation' ? (
                    <LoadingSpinner />
                  ) : (
                    <BarChart3 className="mr-2 h-4 w-4" />
                  )}
                  Stock Valuation
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleExport('movement-history')}
                  disabled={exportLoading === 'movement-history'}
                >
                  {exportLoading === 'movement-history' ? (
                    <LoadingSpinner />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Movement History
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of your inventory status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days of Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 10).map((product) => {
                    const stockLevel = product.current_stock || 0
                    const reorderLevel = product.reorder_level || 0
                    const status = stockLevel === 0 ? 'out' : stockLevel <= reorderLevel ? 'low' : 'good'
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{stockLevel}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {product.unit_of_measure}
                          </span>
                        </TableCell>
                        <TableCell>{reorderLevel}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === 'out' ? 'destructive' :
                              status === 'low' ? 'secondary' : 'default'
                            }
                            className={
                              status === 'low' ? 'bg-orange-100 text-orange-800' :
                              status === 'good' ? 'bg-green-100 text-green-800' : ''
                            }
                          >
                            {status === 'out' ? 'Out of Stock' :
                             status === 'low' ? 'Low Stock' : 'Good'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {stockLevel > 0 ? `~${Math.floor(stockLevel / 10)} days` : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderTree className="h-5 w-5" />
                <span>Category Performance</span>
              </CardTitle>
              <CardDescription>
                Product distribution across categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoriesWithProducts.slice(0, 8).map((category) => (
                  <div key={category.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {category.description || 'No description'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="font-medium">{category.productCount} products</div>
                        <div className="text-sm text-muted-foreground">
                          {products.length > 0 ? ((category.productCount / products.length) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                      <Progress 
                        value={products.length > 0 ? (category.productCount / products.length) * 100 : 0} 
                        className="h-2 w-24" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Warehouse Overview</span>
              </CardTitle>
              <CardDescription>
                Inventory distribution across warehouses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">{warehouse.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {warehouse.code} • {warehouse.address}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{warehouse.total_products || 0} products</div>
                        <div className="text-sm text-muted-foreground">
                          {(warehouse.utilization_percentage || 0).toFixed(1)}% utilized
                        </div>
                      </div>
                      <Progress 
                        value={warehouse.utilization_percentage || 0} 
                        className="h-2 w-24" 
                      />
                      <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}