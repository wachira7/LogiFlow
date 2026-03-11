// src/app/analytics/inventory/page.tsx
'use client';

import { useInventoryAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent} from '@/components/ui/card';
import { KPICard, KPICardsGrid } from '@/components/analytics/KPICards';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockStatusChart, LowStockChart, StockValueCard } from '@/components/analytics/InventoryChart';
import { Package, TrendingUp, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

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

  const hasLowStock = stockReport.low_stock_products > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Analytics</h2>
          <p className="text-muted-foreground">
            Stock levels, product status, and inventory value
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Low Stock Alert */}
      {hasLowStock && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stockReport.low_stock_products} products</strong> are below their
            reorder point. Review the low stock chart below and restock soon.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
        <KPICardsGrid cols={4}>
          <KPICard
            title="Total Products"
            value={stockReport.total_products}
            description="Across all categories"
            icon={Package}
          />
          <KPICard
            title="Active Products"
            value={stockReport.active_products}
            description={`${stockReport.total_products > 0 ? Math.round((stockReport.active_products / stockReport.total_products) * 100) : 0}% of total`}
            icon={CheckCircle2}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <KPICard
            title="Low Stock"
            value={stockReport.low_stock_products}
            description={hasLowStock ? 'Need restocking' : 'All good'}
            icon={AlertTriangle}
            iconColor={hasLowStock ? 'text-destructive' : 'text-muted-foreground'}
            valueColor={hasLowStock ? 'text-destructive' : 'text-green-600'}
          />
          <KPICard
            title="Total Stock Value"
            value={`$${stockReport.total_stock_value.toLocaleString()}`}
            description="Current inventory value"
            icon={TrendingUp}
          />
        </KPICardsGrid>
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <StockStatusChart data={stockReport} />
        <StockValueCard
          totalValue={stockReport.total_stock_value}
          totalProducts={stockReport.total_products}
          activeProducts={stockReport.active_products}
        />
      </div>

      {/* Low Stock Chart */}
      {hasLowStock ? (
        <LowStockChart products={lowStockProducts} />
      ) : (
        <Card className="border-green-600">
          <CardContent className="flex items-center justify-center py-10">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-semibold">All products are well stocked</p>
              <p className="text-sm text-muted-foreground">
                No products are below their reorder point
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}