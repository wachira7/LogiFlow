// app/platform-admin/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft, Bell, Plus, Send, CheckCircle, Clock,
  AlertCircle, RefreshCw, X, Save, BellOff,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { CreateNotificationData, NotificationType, NotificationPriority } from '@/types/platform.types'
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '@/types/platform.types'

const defaultForm: CreateNotificationData = {
  title: '',
  message: '',
  notification_type: 'GENERAL',
  priority: 'MEDIUM',
  is_global: true,
}

export default function NotificationsPage() {
  const {
    notifications,
    isLoadingNotifications,
    notificationsError,
    fetchNotifications,
    createNotification,
    markNotificationSent,
    sendNotificationNow,
  } = usePlatformAdmin()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState<CreateNotificationData>(defaultForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleCreate = async () => {
    if (!formData.title || !formData.message) return
    setIsProcessing(true)
    const success = await createNotification(formData)
    setIsProcessing(false)
    if (success) {
      setIsCreateOpen(false)
      setFormData(defaultForm)
    }
  }

  const handleSendNow = async (id: string) => {
    setSendingId(id)
    await sendNotificationNow(id)
    setSendingId(null)
  }

  const handleMarkSent = async (id: string) => {
    setSendingId(id)
    await markNotificationSent(id)
    setSendingId(null)
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'MAINTENANCE': return 'bg-orange-100 text-orange-800'
      case 'FEATURE':     return 'bg-blue-100 text-blue-800'
      case 'SECURITY':    return 'bg-red-100 text-red-800'
      case 'BILLING':     return 'bg-purple-100 text-purple-800'
      case 'GENERAL':     return 'bg-gray-100 text-gray-800'
      default:            return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH':     return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':   return 'bg-yellow-100 text-yellow-800'
      case 'LOW':      return 'bg-blue-100 text-blue-800'
      default:         return 'bg-gray-100 text-gray-800'
    }
  }

  const pendingCount = notifications.filter(n => !n.is_sent).length
  const sentCount    = notifications.filter(n => n.is_sent).length
  const activeCount  = notifications.filter(n => n.is_active).length

  if (notificationsError) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{notificationsError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <div className="py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/platform-admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Bell className="w-8 h-8" />
                <span>Platform Notifications</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Broadcast messages and alerts to platform users
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Notification
            </Button>
            <Button onClick={() => fetchNotifications()} 
                  variant="outline" size="sm" disabled={isLoadingNotifications}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingNotifications ? 'animate-spin' : ''}`} />
                Refresh
           </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold mt-2">{notifications.length}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">{activeCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="text-3xl font-bold mt-2 text-purple-600">{sentCount}</p>
                </div>
                <Send className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold mt-2 text-orange-600">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>Manage platform-wide broadcast messages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications && notifications.length === 0 ? (
              <div className="p-12">
                <LoadingSpinner size="lg" text="Loading notifications..." />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <BellOff className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p>No notifications yet</p>
                          <Button
                            onClick={() => setIsCreateOpen(true)}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Notification
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {notification.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeBadgeClass(notification.notification_type)}>
                              {notification.notification_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadgeClass(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={notification.is_global ? 'default' : 'secondary'}>
                              {notification.is_global ? 'Global' : 'Targeted'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {notification.is_sent ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sent
                              </Badge>
                            ) : notification.is_active ? (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {notification.sent_at ? formatDate(notification.sent_at) : '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(notification.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {!notification.is_sent && (
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={sendingId === notification.id}
                                  onClick={() => handleSendNow(notification.id)}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  {sendingId === notification.id ? 'Sending...' : 'Send Now'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={sendingId === notification.id}
                                  onClick={() => handleMarkSent(notification.id)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Mark Sent
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
            <DialogDescription>
              Broadcast a message to platform users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Notification title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Write your notification message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.notification_type}
                  onValueChange={(v) => setFormData({ ...formData, notification_type: v as NotificationType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as NotificationPriority })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_global"
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
              />
              <Label htmlFor="is_global">Global (broadcast to all users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsCreateOpen(false); setFormData(defaultForm) }}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isProcessing || !formData.title || !formData.message}
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Creating...' : 'Create Notification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}