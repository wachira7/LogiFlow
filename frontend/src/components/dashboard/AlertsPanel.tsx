// components/dashboard/AlertsPanel.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, CheckCircle, XCircle, Bell } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const alertIcons = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
}

const alertColors = {
  critical: 'text-red-600 bg-red-100 dark:bg-red-950/20',
  warning: 'text-orange-600 bg-orange-100 dark:bg-orange-950/20',
  info: 'text-blue-600 bg-blue-100 dark:bg-blue-950/20',
  success: 'text-green-600 bg-green-100 dark:bg-green-950/20',
}

const badgeColors = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
  success: 'default',
} as const

export function AlertsPanel() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>System Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Loading alerts..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>System Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load alerts</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { alerts } = data

  const criticalAlerts = alerts.filter(alert => alert.type === 'critical').length
  const warningAlerts = alerts.filter(alert => alert.type === 'warning').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>System Alerts</span>
          </div>
          <div className="flex space-x-2">
            {criticalAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts} Critical
              </Badge>
            )}
            {warningAlerts > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningAlerts} Warning
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>All systems operating normally</p>
            <p className="text-sm">No alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert) => {
              const Icon = alertIcons[alert.type]
              const colorClass = alertColors[alert.type]
              const badgeVariant = badgeColors[alert.type]

              return (
                <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-1 rounded-full ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium">{alert.title}</h4>
                      <Badge variant={badgeVariant} className="text-xs capitalize">
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                        {alert.action}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {alerts.length > 4 && (
              <div className="pt-3 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  View All Alerts ({alerts.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}