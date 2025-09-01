// components/dashboard/PerformanceCharts.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function PerformanceCharts() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Performance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Loading performance data..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Performance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load performance data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { performance_metrics } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Performance Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {performance_metrics.map((metric, index) => (
            <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </h4>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-1">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    vs last period
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {performance_metrics.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No performance data available</p>
            <p className="text-sm">Metrics will appear as you use the platform</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}