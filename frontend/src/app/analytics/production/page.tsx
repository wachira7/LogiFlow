// src/app/analytics/production/page.tsx
'use client';

import { useProductionAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Factory, AlertTriangle, RefreshCw, Clock,CheckCircle, XCircle, PlayCircle, PauseCircle, PackageX, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  // Calculate percentages
  const completionRate = dashboard.total_orders > 0
    ? Math.round((dashboard.completed_orders / dashboard.total_orders) * 100)
    : 0;

  const inProgressRate = dashboard.total_orders > 0
    ? Math.round((dashboard.in_progress_orders / dashboard.total_orders) * 100)
    : 0;

  const cancellationRate = dashboard.total_orders > 0
    ? Math.round((dashboard.cancelled_orders / dashboard.total_orders) * 100)
    : 0;

  const materialShortageRate = materialRequirements.total_materials > 0
    ? Math.round((materialRequirements.materials_with_shortage / materialRequirements.total_materials) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production Analytics</h2>
          <p className="text-muted-foreground">
            Manufacturing orders, materials, and production efficiency
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
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.total_orders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Production orders
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <PlayCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboard.in_progress_orders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {inProgressRate}% of total
            </p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboard.completed_orders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        {/* Monthly Completed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Output</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.monthly_completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Status & Materials */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Production Orders Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Production Orders Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Planned Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <PauseCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Planned</p>
                  <p className="text-xs text-muted-foreground">Not yet started</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{dashboard.planned_orders}</p>
              </div>
            </div>

            {/* In Progress Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">In Progress</p>
                  <p className="text-xs text-muted-foreground">Currently manufacturing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">{dashboard.in_progress_orders}</p>
              </div>
            </div>

            {/* Completed Orders */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">Successfully finished</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{dashboard.completed_orders}</p>
              </div>
            </div>

            {/* Cancelled Orders */}
            {dashboard.cancelled_orders > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-destructive">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
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

            {/* Status Progress Bars */}
            <div className="pt-4 border-t space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm text-muted-foreground">{completionRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="text-sm text-muted-foreground">{inProgressRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${inProgressRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material Requirements */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <PackageX className="h-5 w-5" />
              <CardTitle>Material Requirements</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total Materials</p>
                <p className="text-3xl font-bold">{materialRequirements.total_materials}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg border border-destructive">
                <p className="text-sm text-muted-foreground mb-2">With Shortage</p>
                <p className="text-3xl font-bold text-destructive">
                  {materialRequirements.materials_with_shortage}
                </p>
              </div>
            </div>

            {/* Shortage Rate */}
            {materialRequirements.total_materials > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Material Availability</span>
                  <span className="text-sm text-muted-foreground">
                    {100 - materialShortageRate}% available
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      materialShortageRate > 20 ? 'bg-destructive' : 
                      materialShortageRate > 10 ? 'bg-orange-500' : 'bg-green-600'
                    }`}
                    style={{ width: `${100 - materialShortageRate}%` }}
                  />
                </div>
              </div>
            )}

            {/* Material Shortage Details */}
            {materialRequirements.materials_with_shortage > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3 flex items-center text-destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Materials with Shortage
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {materialRequirements.material_requirements
                    .filter(m => m.shortage > 0)
                    .slice(0, 5)
                    .map((material) => (
                      <div 
                        key={material.product_id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border border-destructive/30"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{material.product_name}</p>
                          <p className="text-xs text-muted-foreground">{material.product_sku}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">
                            Short: {material.shortage}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Need: {material.required_quantity} | Have: {material.available_stock}
                          </p>
                        </div>
                      </div>
                    ))}
                  {materialRequirements.material_requirements.filter(m => m.shortage > 0).length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      And {materialRequirements.material_requirements.filter(m => m.shortage > 0).length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* No Shortage Message */}
            {materialRequirements.materials_with_shortage === 0 && materialRequirements.total_materials > 0 && (
              <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">All Materials Available</p>
                  <p className="text-xs text-muted-foreground">No material shortages detected</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Production Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Active Production</p>
              <p className="text-3xl font-bold text-orange-600">{dashboard.in_progress_orders}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Monthly Output</p>
              <p className="text-3xl font-bold">{dashboard.monthly_completed}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Material Availability</p>
              <p className={`text-3xl font-bold ${
                materialShortageRate > 20 ? 'text-destructive' : 
                materialShortageRate > 10 ? 'text-orange-500' : 'text-green-600'
              }`}>
                {100 - materialShortageRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Orders Alert */}
      {dashboard.overdue_orders > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Overdue Production Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {dashboard.overdue_orders}
                </p>
                <p className="text-sm text-muted-foreground">
                  Production orders are past their expected completion date
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