// frontend/src/components/platform-admin/SystemHealth.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, Cpu, HardDrive, MemoryStick, Wifi, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { SystemHealthDashboard, SystemHealthMetric, HealthStatus } from '@/types/platform.types'

interface SystemHealthProps {
  dashboard: SystemHealthDashboard | null
  metrics: SystemHealthMetric[]
  isLoading: boolean
  onRefresh: () => void
  onGenerateTestMetrics: () => Promise<boolean>
}

export function SystemHealth({ 
  dashboard, 
  metrics, 
  isLoading, 
  onRefresh,
  onGenerateTestMetrics 
}: SystemHealthProps) {
  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-600 bg-green-100'
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-100'
      case 'CRITICAL':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5" />
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5" />
      case 'CRITICAL':
        return <XCircle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-red-600'
    if (value >= 70) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  if (isLoading && !dashboard) {
    return (
      <Card>
        <CardContent className="p-12">
          <LoadingSpinner size="lg" text="Loading system health..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>System Health Monitor</span>
              </CardTitle>
              <CardDescription>
                Real-time system performance and health metrics
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={onGenerateTestMetrics} variant="outline" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Test Data
              </Button>
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Status */}
      {dashboard && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full ${getStatusColor(dashboard.overall_status)}`}>
                  {getStatusIcon(dashboard.overall_status)}
                  <span className="text-2xl font-bold">{dashboard.overall_status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  System is {dashboard.overall_status.toLowerCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Usage */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">CPU Usage</span>
                </div>
                <span className="text-2xl font-bold">{dashboard.cpu_usage.toFixed(1)}%</span>
              </div>
              <Progress value={dashboard.cpu_usage} className="h-2" 
                style={{ backgroundColor: getProgressColor(dashboard.cpu_usage) }}/>
              <p className="text-xs text-muted-foreground mt-2">
                {dashboard.cpu_usage < 70 ? 'Optimal' : dashboard.cpu_usage < 90 ? 'High' : 'Critical'}
              </p>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Memory</span>
                </div>
                <span className="text-2xl font-bold">{dashboard.memory_usage.toFixed(1)}%</span>
              </div>
              <Progress value={dashboard.memory_usage} className="h-2" 
                style={{ backgroundColor: getProgressColor(dashboard.memory_usage) }}/>
              <p className="text-xs text-muted-foreground mt-2">
                {dashboard.memory_usage < 70 ? 'Optimal' : dashboard.memory_usage < 90 ? 'High' : 'Critical'}
              </p>
            </CardContent>
          </Card>

          {/* Disk Usage */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Disk Space</span>
                </div>
                <span className="text-2xl font-bold">{dashboard.disk_usage.toFixed(1)}%</span>
              </div>
              <Progress value={dashboard.disk_usage} className="h-2" 
                style={{ backgroundColor: getProgressColor(dashboard.disk_usage) }}/>
              <p className="text-xs text-muted-foreground mt-2">
                {dashboard.disk_usage < 70 ? 'Optimal' : dashboard.disk_usage < 90 ? 'High' : 'Critical'}
              </p>
            </CardContent>
          </Card>

          {/* Uptime */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Uptime</span>
                </div>
                <span className="text-2xl font-bold">{dashboard.uptime_percentage.toFixed(2)}%</span>
              </div>
              <Progress value={dashboard.uptime_percentage} className="h-2" />
              <p className="text-xs text-green-600 mt-2">Excellent</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Wifi className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <p className="text-2xl font-bold">{dashboard.active_connections}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{dashboard.response_time_avg.toFixed(0)}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold">{dashboard.error_rate.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Metrics History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Health Metrics</CardTitle>
          <CardDescription>Historical system health data</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No health metrics recorded yet</p>
              <Button onClick={onGenerateTestMetrics} className="mt-4">
                Generate Test Metrics
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.slice(0, 10).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{metric.metric_name.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(metric.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {metric.metric_value.toFixed(2)} {metric.metric_unit}
                    </p>
                    {metric.threshold_critical && (
                      <p className="text-xs text-muted-foreground">
                        Critical: {metric.threshold_critical} {metric.metric_unit}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
