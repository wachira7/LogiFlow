// src/components/warehousing/TransferDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  Package,
  Calendar,
  User,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react'
import type { TransferStatus } from '@/types/warehousing.types'

interface TransferDetailProps {
  transferId: string
}

const statusColors: Record<TransferStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<TransferStatus, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function TransferDetail({ transferId }: TransferDetailProps) {
  const router = useRouter()
  const {
    currentTransfer,
    loading,
    error,
    fetchTransferById,
    deleteTransfer,
    approveTransfer,
    startTransfer,
    completeTransfer,
    cancelTransfer,
  } = useWarehouseTransfers()

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    action: 'approve' | 'start' | 'complete' | 'cancel' | 'delete' | null
    title: string
    description: string
  }>({
    open: false,
    action: null,
    title: '',
    description: '',
  })

  useEffect(() => {
    fetchTransferById(transferId)
  }, [transferId, fetchTransferById])

  const handleAction = (action: 'approve' | 'start' | 'complete' | 'cancel' | 'delete') => {
    const dialogConfig = {
      approve: {
        title: 'Approve Transfer',
        description: 'Are you sure you want to approve this transfer? This will move it to IN_TRANSIT status.',
      },
      start: {
        title: 'Start Transfer',
        description: 'This will deduct stock from the source warehouse. Are you sure you want to continue?',
      },
      complete: {
        title: 'Complete Transfer',
        description: 'This will add stock to the destination warehouse and mark the transfer as completed.',
      },
      cancel: {
        title: 'Cancel Transfer',
        description: 'Are you sure you want to cancel this transfer? Stock will be restored if applicable.',
      },
      delete: {
        title: 'Delete Transfer',
        description: 'Are you sure you want to delete this transfer? This action cannot be undone.',
      },
    }

    setDialogState({
      open: true,
      action,
      ...dialogConfig[action],
    })
  }

  const handleConfirmAction = async () => {
    if (!dialogState.action) return

    setActionLoading(true)
    setActionError(null)

    try {
      switch (dialogState.action) {
        case 'approve':
          await approveTransfer(transferId)
          break
        case 'start':
          await startTransfer(transferId)
          break
        case 'complete':
          await completeTransfer(transferId)
          break
        case 'cancel':
          await cancelTransfer(transferId)
          break
        case 'delete':
          await deleteTransfer(transferId)
          router.push('/warehousing/transfers')
          return
      }
      await fetchTransferById(transferId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
      setDialogState({ open: false, action: null, title: '', description: '' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !currentTransfer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium">Failed to load transfer details</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const transfer = currentTransfer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{transfer.transfer_number}</h2>
            <p className="text-muted-foreground">Warehouse Transfer Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {transfer.status === 'PENDING' && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push(`/warehousing/transfers/${transferId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction('approve')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          {transfer.status === 'IN_TRANSIT' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleAction('start')}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Transfer
              </Button>
              <Button variant="default" size="sm" onClick={() => handleAction('complete')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            </>
          )}
          {(transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT') && (
            <Button variant="outline" size="sm" onClick={() => handleAction('cancel')}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {(transfer.status === 'PENDING' || transfer.status === 'CANCELLED') && (
            <Button variant="outline" size="sm" onClick={() => handleAction('delete')}>
              <Trash2 className="h-4 w-4 mr-2 text-red-600" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Action Failed</p>
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      {/* Status Warning for Insufficient Stock */}
      {transfer.status === 'PENDING' && !transfer.all_items_sufficient_stock && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Insufficient Stock</p>
            <p className="text-sm">Some items don&apos;t have sufficient stock in the source warehouse. Please review before approving.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRightLeft className="h-5 w-5 mr-2" />
                Transfer Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-lg font-semibold">{transfer.source_warehouse_name}</p>
                </div>
                <ArrowRightLeft className="h-8 w-8 text-muted-foreground mx-4" />
                <div className="flex-1 text-right">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-lg font-semibold">{transfer.destination_warehouse_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Transfer Items ({transfer.total_items})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Source Location</TableHead>
                    <TableHead>Dest. Location</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.transfer_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.product_sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.source_location || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.destination_location || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{item.source_stock_available}</span>
                          {!item.sufficient_source_stock && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.item_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Items: {transfer.total_items}</p>
                  <p className="text-sm text-muted-foreground">Total Quantity: {transfer.total_quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(transfer.total_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {transfer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{transfer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${statusColors[transfer.status]} text-base px-4 py-2`}>
                {statusLabels[transfer.status]}
              </Badge>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Initiated</p>
                <p className="text-sm text-muted-foreground">{formatDate(transfer.initiated_at)}</p>
              </div>
              {transfer.completed_at && (
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-sm text-muted-foreground">{formatDate(transfer.completed_at)}</p>
                </div>
              )}
              {transfer.transfer_duration_days !== null && (
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {transfer.transfer_duration_days} {transfer.transfer_duration_days === 1 ? 'day' : 'days'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                People
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Initiated By</p>
                <p className="text-sm text-muted-foreground">{transfer.initiated_by_name}</p>
              </div>
              {transfer.approved_by_name && (
                <div>
                  <p className="text-sm font-medium">Approved By</p>
                  <p className="text-sm text-muted-foreground">{transfer.approved_by_name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        title={dialogState.title}
        description={dialogState.description}
        onConfirm={handleConfirmAction}
        loading={actionLoading}
        variant={dialogState.action === 'delete' || dialogState.action === 'cancel' ? 'destructive' : 'default'}
      />
    </div>
  )
}