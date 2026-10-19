// src/app/analytics/page.tsx
'use client';

import { useAnalyticsSummary, useDistributionAnalytics } from '@/hooks/useAnalytics';
import { useSubscriptions } from '@/hooks/useBilling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TenantFinancialSummary } from '@/components/analytics/TenantFinancialSummary';
import { KPICard, KPICardsGrid } from '@/components/analytics/KPICards';
import { Package, TrendingUp, ShoppingCart, Truck, Factory, Warehouse, RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function AnalyticsOverviewPage() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();
  const { dashboard: distDashboard } = useDistributionAnalytics();
  const { subscriptions } = useSubscriptions();

  const activeSubscription = useMemo(
    () => subscriptions.find(s => s.status === 'ACTIVE' || s.status === 'TRIALING') ?? null,
    [subscriptions]
  );

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

  const totalRevenue         = summary.distribution.total_revenue;
  const totalOrders          = summary.distribution.total_orders;
  const totalProducts        = summary.inventory.total_products;
  const totalTransfers       = summary.warehousing.total_transfers;
  const totalProductionOrders = summary.production.total_orders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics across all modules
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top Level KPIs */}
      
       <KPICardsGrid cols={4}>
          <KPICard
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            description={`${summary.distribution.delivered_orders} orders delivered`}
            icon={TrendingUp}
          />
          <KPICard
            title="Total Orders"
            value={totalOrders}
            description={`${summary.distribution.delivered_orders} delivered${summary.distribution.cancelled_orders > 0 ? ` · ${summary.distribution.cancelled_orders} cancelled` : ''}`}
            icon={ShoppingCart}
            valueColor={summary.distribution.cancelled_orders > 0 ? undefined : undefined}
          />
          <KPICard
            title="Total Products"
            value={totalProducts}
            description={`${summary.inventory.active_products} active`}
            icon={Package}
          />
          <KPICard
            title="Stock Value"
            value={`$${summary.inventory.total_stock_value.toLocaleString()}`}
            description={summary.inventory.low_stock_products > 0 ? `${summary.inventory.low_stock_products} low stock` : 'All stocked'}
            icon={TrendingUp}
            valueColor={summary.inventory.low_stock_products > 0 ? 'text-destructive' : undefined}
          />
          <KPICard
            title="Production Orders"
            value={totalProductionOrders}
            description={`${summary.production.in_progress_orders} in progress${summary.production.overdue_orders > 0 ? ` · ${summary.production.overdue_orders} overdue` : ''}`}
            icon={Factory}
            valueColor={summary.production.overdue_orders > 0 ? 'text-destructive' : undefined}
          />
          <KPICard
            title="Warehouse Transfers"
            value={totalTransfers}
            description={`${summary.warehousing.completed_transfers} completed`}
            icon={Warehouse}
          />
        </KPICardsGrid>
      {/* Module Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Inventory */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <CardTitle>Inventory</CardTitle>
              </div>
              <Link href="/analytics/inventory">
                <Button variant="ghost" size="sm">
                  View Details <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{summary.inventory.total_products}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{summary.inventory.active_products}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{summary.inventory.inactive_products}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className={`text-2xl font-bold ${summary.inventory.low_stock_products > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {summary.inventory.low_stock_products}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
              <p className="text-xl font-bold">${summary.inventory.total_stock_value.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <CardTitle>Distribution</CardTitle>
              </div>
              <Link href="/analytics/distribution">
                <Button variant="ghost" size="sm">
                  View Details <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summary.distribution.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New</p>
                <p className="text-2xl font-bold text-blue-600">{summary.distribution.new_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-orange-600">{summary.distribution.processing_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{summary.distribution.delivered_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{summary.distribution.delivered_orders}</p>
              </div>
              {summary.distribution.cancelled_orders > 0 && (
                <div className="col-span-2 flex items-center gap-1 text-sm text-destructive font-medium">
                  <ArrowDownRight className="h-4 w-4" />
                  {summary.distribution.cancelled_orders} orders cancelled
                </div>
              )}
            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">${summary.distribution.total_revenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Production */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <CardTitle>Production</CardTitle>
              </div>
              <Link href="/analytics/production">
                <Button variant="ghost" size="sm">
                  View Details <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summary.production.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold text-blue-600">{summary.production.planned_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{summary.production.in_progress_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{summary.production.completed_orders}</p>
              </div>
            </div>
            {summary.production.overdue_orders > 0 && (
              <div className="pt-4 border-t mt-4">
                <p className="text-sm text-destructive flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {summary.production.overdue_orders} overdue orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warehousing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Warehouse className="h-5 w-5" />
                <CardTitle>Warehousing</CardTitle>
              </div>
              <Link href="/analytics/warehousing">
                <Button variant="ghost" size="sm">
                  View Details <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-2xl font-bold">{summary.warehousing.total_transfers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{summary.warehousing.pending_transfers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">{summary.warehousing.in_transit_transfers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{summary.warehousing.completed_transfers}</p>
              </div>
            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">Avg Transfer Time</p>
              <p className="text-xl font-bold">{summary.warehousing.average_transfer_days} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Financial Summary */}
      <TenantFinancialSummary
        distribution={distDashboard}
        inventory={summary.inventory}
        subscription={activeSubscription}
      />
    </div>
  );
}