// src/app/analytics/page.tsx
'use client';

import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Package, TrendingUp, ShoppingCart, Truck, Factory, Warehouse, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsOverviewPage() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();

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

  // Calculate totals and percentages
  const totalRevenue = summary.distribution.total_revenue + summary.financial.total_revenue;
  const totalOrders = summary.distribution.total_orders;
  const totalProducts = summary.inventory.total_products;
  const totalTransfers = summary.warehousing.total_transfers;
  const totalProductionOrders = summary.production.total_orders;

  return (
    <div className="space-y-6 p-6">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.financial.transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{summary.distribution.delivered_orders} delivered</span>
              {summary.distribution.cancelled_orders > 0 && (
                <span className="ml-2 flex items-center text-destructive">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {summary.distribution.cancelled_orders} cancelled
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {summary.inventory.active_products} active
            </p>
          </CardContent>
        </Card>

        {/* Stock Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.inventory.total_stock_value.toLocaleString()}
            </div>
            {summary.inventory.low_stock_products > 0 && (
              <p className="text-xs text-destructive flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {summary.inventory.low_stock_products} low stock items
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Production Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Orders</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionOrders}</div>
            <p className="text-xs text-muted-foreground">
              {summary.production.in_progress_orders} in progress
            </p>
          </CardContent>
        </Card>

        {/* Warehouse Transfers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouse Transfers</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransfers}</div>
            <p className="text-xs text-muted-foreground">
              {summary.warehousing.completed_transfers} completed
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.subscriptions.active_subscriptions}</div>
            <p className="text-xs text-muted-foreground">
              ${summary.subscriptions.monthly_revenue.toLocaleString()} MRR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Inventory Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <CardTitle>Inventory</CardTitle>
              </div>
              <Link href="/analytics/inventory">
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{summary.inventory.total_products}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.inventory.active_products}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">
                  {summary.inventory.inactive_products}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className={`text-2xl font-bold ${summary.inventory.low_stock_products > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {summary.inventory.low_stock_products}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
              <p className="text-xl font-bold">
                ${summary.inventory.total_stock_value.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <CardTitle>Distribution</CardTitle>
              </div>
              <Link href="/analytics/distribution">
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summary.distribution.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.distribution.new_orders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.distribution.processing_orders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.distribution.delivered_orders}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">
                ${summary.distribution.total_revenue.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Production Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <CardTitle>Production</CardTitle>
              </div>
              <Link href="/analytics/production">
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summary.production.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.production.planned_orders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.production.in_progress_orders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.production.completed_orders}
                </p>
              </div>
            </div>
            {summary.production.overdue_orders > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-destructive flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {summary.production.overdue_orders} overdue orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warehousing Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Warehouse className="h-5 w-5" />
                <CardTitle>Warehousing</CardTitle>
              </div>
              <Link href="/warehousing/reports">
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-2xl font-bold">{summary.warehousing.total_transfers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.warehousing.pending_transfers}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.warehousing.in_transit_transfers}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.warehousing.completed_transfers}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Avg Transfer Time</p>
              <p className="text-xl font-bold">
                {summary.warehousing.average_transfer_days} days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Financial Summary</CardTitle>
            </div>
            <Link href="/analytics/financial">
              <Button variant="ghost" size="sm">
                View Details
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                ${summary.financial.total_revenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.financial.transaction_count} transactions
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stripe</p>
              <p className="text-xl font-bold">
                ${summary.financial.provider_revenue.stripe.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">M-Pesa</p>
              <p className="text-xl font-bold">
                ${summary.financial.provider_revenue.mpesa.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Crypto</p>
              <p className="text-xl font-bold">
                ${summary.financial.provider_revenue.crypto.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-4">Subscriptions</h4>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{summary.subscriptions.total_subscriptions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-green-600">
                  {summary.subscriptions.active_subscriptions}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial</p>
                <p className="text-xl font-bold text-blue-600">
                  {summary.subscriptions.trial_subscriptions}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-xl font-bold">
                  ${summary.subscriptions.monthly_revenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}