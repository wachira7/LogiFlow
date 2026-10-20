// src/app/analytics/production/page.tsx
'use client';

import { useProductionAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductionOrdersChart, MaterialShortageChart } from '@/components/analytics/ProductionChart';
import { Factory, CheckCircle2, Clock, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { KPICard, KPICardsGrid } from '@/components/analytics/KPICards';

export default function ProductionAnalyticsPage() {
  const { dashboard, materialRequirements, loading, error, refetch } = useProductionAnalytics();

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

  const completionRate = dashboard.total_orders > 0
    ? Math.round((dashboard.completed_orders / dashboard.total_orders) * 100)
    : 0;

  const hasOverdue   = dashboard.overdue_orders > 0;
  const hasShortages = materialRequirements.materials_with_shortage > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production Analytics</h2>
          <p className="text-muted-foreground">
            Production orders, efficiency, and material availability
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {hasOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{dashboard.overdue_orders} production order{dashboard.overdue_orders > 1 ? 's are' : ' is'} overdue.</strong>{' '}
            Review your production schedule and reassign resources where needed.
          </AlertDescription>
        </Alert>
      )}

      {hasShortages && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{materialRequirements.materials_with_shortage} material{materialRequirements.materials_with_shortage > 1 ? 's have' : ' has'} a shortage.</strong>{' '}
            This may delay upcoming production orders. Review the chart below.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
        <KPICardsGrid cols={4}>
          <KPICard
            title="Total Orders"
            value={dashboard.total_orders}
            description={`${dashboard.monthly_completed} completed this month`}
            icon={Factory}
          />
          <KPICard
            title="In Progress"
            value={dashboard.in_progress_orders}
            description={`${dashboard.planned_orders} planned`}
            icon={TrendingUp}
            iconColor="text-orange-500"
            valueColor="text-orange-500"
          />
          <KPICard
            title="Completed"
            value={dashboard.completed_orders}
            description={`${completionRate}% completion rate`}
            icon={CheckCircle2}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <KPICard
            title="Overdue"
            value={dashboard.overdue_orders}
            description={hasOverdue ? 'Needs attention' : 'On schedule'}
            icon={Clock}
            iconColor={hasOverdue ? 'text-destructive' : 'text-muted-foreground'}
            valueColor={hasOverdue ? 'text-destructive' : 'text-green-600'}
          />
        </KPICardsGrid>
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProductionOrdersChart data={dashboard} />
        <MaterialShortageChart data={materialRequirements} />
      </div>

      {/* All good state */}
      {!hasOverdue && !hasShortages && dashboard.total_orders > 0 && (
        <Card className="border-green-600">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-semibold">Production is running smoothly</p>
              <p className="text-sm text-muted-foreground">
                No overdue orders or material shortages
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}