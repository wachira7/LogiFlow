// components/dashboard/QuickActions.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Settings, Package, BarChart3, ArrowRight } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const actionIcons = {
  users: Users,
  settings: Settings,
  package: Package,
  chart: BarChart3,
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/20 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/20 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/20 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/20 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/20 dark:text-red-300',
  yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300',
}

export function QuickActions() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Loading actions..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load quick actions</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { quick_actions } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quick_actions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No quick actions available</p>
            <p className="text-sm">Actions will appear here as you set up your account</p>
          </div>
        ) : (
          <>
            {quick_actions.map((action) => {
              const Icon = actionIcons[action.icon as keyof typeof actionIcons] || Package
              const colorClass = colorClasses[action.color] || colorClasses.blue

              return (
                <Link key={action.id} href={action.href}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-md transition-colors ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium group-hover:text-foreground">
                          {action.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              )
            })}
            
            <div className="pt-4 border-t">
              <Link href="/analytics">
                <Button variant="outline" className="w-full group">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View All Analytics
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}