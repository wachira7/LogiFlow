// src/app/analytics/warehousing/page.tsx
'use client';

import { useWarehousingAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransferStatusChart, StockMovementsChart, MonthlyTransfersChart } from '@/components/analytics/WarehousingChart';
import { KPICard, KPICardsGrid } from '@/components/analytics/KPICards';
import { Warehouse, ArrowRightLeft, Clock, CheckCircle2, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

export default function WarehousingAnalyticsPage() {
  const { dashboard, stockMovements, loading, error, refetch } = useWarehousingAnalytics();

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

  //Computed metrics
  const completionRate = dashboard.total_transfers > 0
    ? Math.round((dashboard.completed_transfers / dashboard.total_transfers) * 100)
    : 0;

  const pendingRate = dashboard.total_transfers > 0
    ? Math.round((dashboard.pending_transfers / dashboard.total_transfers) * 100)
    : 0;

  const monthlyCompletionRate = dashboard.monthly_transfers > 0
    ? Math.round((dashboard.monthly_completed / dashboard.monthly_transfers) * 100)
    : 0;

  const hasHighPending = pendingRate > 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Warehousing Analytics</h2>
          <p className="text-muted-foreground">
            Stock transfers, movements, and warehouse performance
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* High Pending Alert */}
      {hasHighPending && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingRate}% of transfers are pending.</strong> Consider reviewing
            your transfer pipeline — {dashboard.pending_transfers} transfers are yet to start.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
       <KPICardsGrid cols={4}>
          <KPICard
            title="Total Transfers"
            value={dashboard.total_transfers}
            description={`${dashboard.monthly_transfers} this month`}
            icon={Warehouse}
          />
          <KPICard
            title="In Transit"
            value={dashboard.in_transit_transfers}
            description={`$${dashboard.in_transit_value.toLocaleString()} value in transit`}
            icon={ArrowRightLeft}
            iconColor="text-blue-600"
            valueColor="text-blue-600"
          />
          <KPICard
            title="Completed"
            value={dashboard.completed_transfers}
            description={`${completionRate}% completion rate`}
            icon={CheckCircle2}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <KPICard
            title="Avg Transfer Time"
            value={`${dashboard.average_transfer_days} days`}
            description="Per transfer on average"
            icon={Clock}
          />
        </KPICardsGrid>
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <TransferStatusChart data={dashboard} />
        <MonthlyTransfersChart dashboard={dashboard} />
      </div>

      {/* Stock Movements */}
      <StockMovementsChart data={stockMovements} />

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Warehousing Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
              <p className={`text-3xl font-bold ${
                completionRate >= 80 ? 'text-green-600' :
                completionRate >= 60 ? 'text-orange-500' : 'text-destructive'
              }`}>
                {completionRate}%
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Monthly Output</p>
              <p className="text-3xl font-bold">{dashboard.monthly_completed}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Monthly Rate</p>
              <p className={`text-3xl font-bold ${
                monthlyCompletionRate >= 80 ? 'text-green-600' : 'text-orange-500'
              }`}>
                {monthlyCompletionRate}%
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Unique Routes</p>
              <p className="text-3xl font-bold">
                {stockMovements.total_movement_pairs}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancelled Transfers Alert */}
      {dashboard.cancelled_transfers > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Cancelled Transfers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {dashboard.cancelled_transfers}
                </p>
                <p className="text-sm text-muted-foreground">
                  Transfer{dashboard.cancelled_transfers > 1 ? 's were' : ' was'} cancelled.
                  Review your transfer workflow to reduce cancellations.
                </p>
              </div>
              <Badge variant="destructive" className="text-lg px-4 py-2">
                {Math.round((dashboard.cancelled_transfers / dashboard.total_transfers) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Good State */}
      {dashboard.cancelled_transfers === 0 &&
       dashboard.pending_transfers === 0 &&
       dashboard.total_transfers > 0 && (
        <Card className="border-green-600">
          <CardContent className="flex items-center justify-center py-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-semibold">All transfers are active or completed</p>
              <p className="text-sm text-muted-foreground">
                No pending or cancelled transfers at this time
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}