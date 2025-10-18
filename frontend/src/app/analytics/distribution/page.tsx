// src/app/analytics/distribution/page.tsx
'use client';

import { useDistributionAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Truck, ShoppingCart, DollarSign, AlertTriangle, RefreshCw, PackageCheck, PackageX, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DistributionAnalyticsPage() {
  const { dashboard, trackingReport, loading, error, refetch } = useDistributionAnalytics();

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
  const deliveryRate = dashboard.total_orders > 0
    ? Math.round((dashboard.delivered_orders / dashboard.total_orders) * 100)
    : 0;

  const cancellationRate = dashboard.total_orders > 0
    ? Math.round((dashboard.cancelled_orders / dashboard.total_orders) * 100)
    : 0;

  const avgOrderValue = dashboard.total_orders > 0
    ? dashboard.total_revenue / dashboard.total_orders
    : 0;

  const totalShipments = trackingReport.pending_shipments + 
                         trackingReport.picked_shipments + 
                         trackingReport.packed_shipments + 
                         trackingReport.shipped_shipments + 
                         trackingReport.delivered_shipments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Distribution Analytics</h2>
          <p className="text-muted-foreground">
            Orders, shipments, and delivery performance insights
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.total_orders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time orders
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboard.total_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {dashboard.total_orders} orders
            </p>
          </CardContent>
        </Card>

        {/* Delivered Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <PackageCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboard.delivered_orders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        {/* Avg Order Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders & Shipments Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders Status Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Orders Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">New Orders</p>
                  <p className="text-xs text-muted-foreground">Awaiting processing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{dashboard.new_orders}</p>
              </div>
            </div>

            {/* Processing Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Processing</p>
                  <p className="text-xs text-muted-foreground">Being prepared</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">{dashboard.processing_orders}</p>
              </div>
            </div>

            {/* Shipped Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Shipped</p>
                  <p className="text-xs text-muted-foreground">In transit</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">{dashboard.shipped_orders}</p>
              </div>
            </div>

            {/* Delivered Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <PackageCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Delivered</p>
                  <p className="text-xs text-muted-foreground">Successfully completed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{dashboard.delivered_orders}</p>
              </div>
            </div>

            {/* Cancelled Orders */}
            {dashboard.cancelled_orders > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-destructive">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <PackageX className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">Cancelled</p>
                    <p className="text-xs text-muted-foreground">{cancellationRate}% cancellation rate</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-destructive">{dashboard.cancelled_orders}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <CardTitle>Shipments Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Shipments */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Shipments</p>
              <p className="text-3xl font-bold">{totalShipments}</p>
            </div>

            {/* Shipment Status Progress Bars */}
            <div className="space-y-3">
              {/* Pending */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-sm text-muted-foreground">
                    {trackingReport.pending_shipments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: totalShipments > 0 
                        ? `${(trackingReport.pending_shipments / totalShipments) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>

              {/* Picked */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Picked</span>
                  <span className="text-sm text-muted-foreground">
                    {trackingReport.picked_shipments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: totalShipments > 0 
                        ? `${(trackingReport.picked_shipments / totalShipments) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>

              {/* Packed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Packed</span>
                  <span className="text-sm text-muted-foreground">
                    {trackingReport.packed_shipments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: totalShipments > 0 
                        ? `${(trackingReport.packed_shipments / totalShipments) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>

              {/* Shipped */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Shipped</span>
                  <span className="text-sm text-muted-foreground">
                    {trackingReport.shipped_shipments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: totalShipments > 0 
                        ? `${(trackingReport.shipped_shipments / totalShipments) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>

              {/* Delivered */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Delivered</span>
                  <span className="text-sm text-muted-foreground">
                    {trackingReport.delivered_shipments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: totalShipments > 0 
                        ? `${(trackingReport.delivered_shipments / totalShipments) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Average Delivery Time */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Delivery Time</span>
                <Badge variant="outline">
                  {trackingReport.average_delivery_days} days
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Performance Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Delivery Rate</p>
              <p className="text-3xl font-bold text-green-600">{deliveryRate}%</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Monthly Orders</p>
              <p className="text-3xl font-bold">{dashboard.monthly_orders}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Monthly Revenue</p>
              <p className="text-3xl font-bold">${dashboard.monthly_revenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Cancellation Rate</p>
              <p className={`text-3xl font-bold ${cancellationRate > 5 ? 'text-destructive' : 'text-green-600'}`}>
                {cancellationRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delayed Shipments Alert */}
      {trackingReport.delayed_shipments > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Delayed Shipments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {trackingReport.delayed_shipments}
                </p>
                <p className="text-sm text-muted-foreground">
                  Shipments are delayed beyond expected delivery time
                </p>
              </div>
              <Clock className="h-12 w-12 text-destructive opacity-20" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}