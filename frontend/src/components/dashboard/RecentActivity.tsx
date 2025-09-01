// components/dashboard/RecentActivity.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserPlus, Building, Package, ShoppingCart, Clock } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const activityIcons = {
  user_joined: UserPlus,
  company_created: Building,
  product_added: Package,
  order_created: ShoppingCart,
}

const activityColors = {
  user_joined: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300',
  company_created: 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300',
  product_added: 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300',
  order_created: 'bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300',
}

// Helper function to format time ago
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date()
  const activityTime = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks}w ago`
}

export function RecentActivity() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Loading activity..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load recent activity</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { recent_activity } = data

  if (recent_activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Activity will appear here as you use the platform</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recent_activity.slice(0, 6).map((activity) => {
            const Icon = activityIcons[activity.type] || UserPlus
            const colorClass = activityColors[activity.type] || activityColors.user_joined
            const userInitials = activity.user.name
              .split(' ')
              .map((name) => name.charAt(0))
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div key={activity.id} className="flex items-start space-x-3 group">
                <div className={`p-2 rounded-full ${colorClass} transition-colors`}>
                  <Icon className="w-3 h-3" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {activity.message}
                    </p>
                    <Badge variant="outline" className="text-xs whitespace-nowrap ml-2 flex-shrink-0">
                      {formatTimeAgo(activity.timestamp)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs bg-muted">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">
                      {activity.user.email}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {recent_activity.length > 6 && (
          <div className="pt-4 border-t mt-4">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left">
              View all activity ({recent_activity.length}) →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}