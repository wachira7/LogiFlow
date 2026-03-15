//src/components/shared/NotificationBell.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/services/api'
import { formatDate } from '@/lib/utils'

interface PlatformNotification {
  id: string
  title: string
  message: string
  notification_type: string
  priority: string
  created_at: string
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM:   'bg-blue-100 text-blue-800 border-blue-200',
  LOW:      'bg-gray-100 text-gray-800 border-gray-200',
}

const TYPE_ICONS: Record<string, string> = {
  MAINTENANCE: '🔧',
  FEATURE:     '✨',
  SECURITY:    '🔒',
  BILLING:     '💳',
  GENERAL:     '📢',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await api.get<PlatformNotification[]>('/api/v1/auth/notifications/')
      if (response.success && response.data) {
        const fetched = Array.isArray(response.data) ? response.data : []
        setNotifications(fetched)

        // Mark any new notifications as unread
        const storedRead = JSON.parse(
          localStorage.getItem('readNotificationIds') || '[]'
        ) as string[]
        const readSet = new Set(storedRead)
        const newUnread = new Set(
          fetched.filter(n => !readSet.has(n.id)).map(n => n.id)
        )
        setUnreadIds(newUnread)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount + poll every 5 minutes
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    // Mark all as read when dropdown opens
    if (open && unreadIds.size > 0) {
      const allReadIds = notifications.map(n => n.id)
      localStorage.setItem('readNotificationIds', JSON.stringify(allReadIds))
      setUnreadIds(new Set())
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadIds.size > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadIds.size > 9 ? '9+' : unreadIds.size}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Platform Notifications</span>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notifications.length}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border text-sm ${
                    PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.LOW
                  } ${unreadIds.has(notification.id) ? 'font-medium' : ''}`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-base mt-0.5">
                      {TYPE_ICONS[notification.notification_type] || '📢'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{notification.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-2 opacity-80">
                        {notification.message}
                      </p>
                      <p className="text-xs mt-1 opacity-60">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {unreadIds.has(notification.id) && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={fetchNotifications}
              >
                Refresh
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}