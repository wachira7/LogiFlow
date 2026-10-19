// src/app/analytics/distribution/page.tsx
'use client';

import { useDistributionAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShipmentPipelineChart, OrdersStatusChart } from '@/components/analytics/DistributionChart';
import { KPICard, KPICardsGrid } from '@/components/analytics/KPICards';
import { Truck,ShoppingCart, CheckCircle2, Clock, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

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

  const hasDelays = trackingReport.delayed_shipments > 0;
  const deliveryRate = dashboard.total_orders > 0
    ? Math.round((dashboard.delivered_orders / dashboard.total_orders) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Distribution Analytics</h2>
          <p className="text-muted-foreground">
            Orders, shipments, deliveries, and revenue
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Delays Alert */}
      {hasDelays && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{trackingReport.delayed_shipments} shipment{trackingReport.delayed_shipments > 1 ? 's are' : ' is'} delayed.</strong>{' '}
            Review the pipeline below and follow up with your delivery team.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
        <KPICardsGrid cols={4}>
          <KPICard
            title="Total Orders"
            value={dashboard.total_orders}
            description={`${dashboard.monthly_orders} this month`}
            icon={ShoppingCart}
          />
          <KPICard
            title="Delivered"
            value={dashboard.delivered_orders}
            description={`${deliveryRate}% delivery rate`}
            icon={CheckCircle2}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <KPICard
            title="Avg Delivery Time"
            value={`${trackingReport.average_delivery_days} days`}
            description="Per order on average"
            icon={Clock}
          />
          <KPICard
            title="Total Revenue"
            value={`$${dashboard.total_revenue.toLocaleString()}`}
            description={`$${dashboard.monthly_revenue.toLocaleString()} this month`}
            icon={TrendingUp}
          />
          <KPICard
            title="Total Shipments"
            value={trackingReport.total_shipments}
            description={`${trackingReport.on_time_percentage}% on-time rate`}
            icon={Truck}
          />
        </KPICardsGrid>
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ShipmentPipelineChart data={trackingReport} />
        <OrdersStatusChart data={dashboard} />
      </div>

      {/* Cancelled Orders Alert */}
      {dashboard.cancelled_orders > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Cancelled Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong className="text-destructive">{dashboard.cancelled_orders}</strong>{' '}
              order{dashboard.cancelled_orders > 1 ? 's were' : ' was'} cancelled.
              Review your fulfilment process to reduce cancellations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}