// src/app/analytics/inventory/page.tsx
'use client';

import { useInventoryAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Package, TrendingUp, AlertTriangle, CheckCircle, XCircle, RefreshCw, DollarSign, BarChart3, PackageX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InventoryAnalyticsPage() {
  const { stockReport, lowStockProducts, loading, error, refetch } = useInventoryAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Calculate percentages
  const activePercentage = stockReport.total_products > 0 
    ? Math.round((stockReport.active_products / stockReport.total_products) * 100)
    : 0;
  
  const inactivePercentage = stockReport.total_products > 0
    ? Math.round((stockReport.inactive_products / stockReport.total_products) * 100)
    : 0;

  const lowStockPercentage = stockReport.total_products > 0
    ? Math.round((stockReport.low_stock_products / stockReport.total_products) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Analytics</h2>
          <p className="text-muted-foreground">
            Detailed insights into your inventory and stock levels
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockReport.total_products}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All products in system
            </p>
          </CardContent>
        </Card>

        {/* Active Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stockReport.active_products}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activePercentage}% of total
            </p>
          </CardContent>
        </Card>

        {/* Inactive Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Products</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stockReport.inactive_products}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {inactivePercentage}% of total
            </p>
          </CardContent>
        </Card>

        {/* Total Stock Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stockReport.total_stock_value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Status Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Product Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Products Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stockReport.active_products} ({activePercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
            </div>

            {/* Inactive Products Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Inactive</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stockReport.inactive_products} ({inactivePercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gray-500 h-2 rounded-full transition-all"
                  style={{ width: `${inactivePercentage}%` }}
                />
              </div>
            </div>

            {/* Low Stock Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Low Stock</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stockReport.low_stock_products} ({lowStockPercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-destructive h-2 rounded-full transition-all"
                  style={{ width: `${lowStockPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Health Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Stock Health Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Overall Health</p>
                <p className="text-2xl font-bold">
                  {stockReport.low_stock_products === 0 ? 'Excellent' : 
                   stockReport.low_stock_products < 5 ? 'Good' : 
                   stockReport.low_stock_products < 10 ? 'Fair' : 'Needs Attention'}
                </p>
              </div>
              {stockReport.low_stock_products === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : stockReport.low_stock_products < 10 ? (
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              ) : (
                <PackageX className="h-8 w-8 text-destructive" />
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Rate</span>
                <span className="text-sm font-medium">{activePercentage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Value per Product</span>
                <span className="text-sm font-medium">
                  ${stockReport.total_products > 0 
                    ? Math.round(stockReport.total_stock_value / stockReport.total_products).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Categories</span>
                <span className="text-sm font-medium">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products Alert */}
      {stockReport.low_stock_products > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Low Stock Alert</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {stockReport.low_stock_products} product{stockReport.low_stock_products > 1 ? 's' : ''} need{stockReport.low_stock_products === 1 ? 's' : ''} reordering
            </p>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <PackageX className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {product.current_stock} / {product.reorder_point}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {product.category}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    And {lowStockProducts.length - 5} more...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Low stock products detected but details unavailable. Please check inventory.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Issues Message */}
      {stockReport.low_stock_products === 0 && (
        <Card className="border-green-600">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold">All Stock Levels Healthy</h3>
              <p className="text-sm text-muted-foreground">
                No products need reordering at this time
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}