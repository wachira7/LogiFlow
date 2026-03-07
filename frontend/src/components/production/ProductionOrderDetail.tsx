// src/components/production/ProductionOrderDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionOrders } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit, Play, CheckCircle, XCircle, AlertTriangle, Package, ListChecks, Calendar, User, TrendingUp } from 'lucide-react'
import type { ProductionOrderStatus, ProductionStepStatus } from '@/types/production.types'

interface ProductionOrderDetailProps {
  orderId: string
}

export function ProductionOrderDetail({ orderId }: ProductionOrderDetailProps) {
  const router = useRouter()
  const {
    currentOrder,
    loading,
    fetchOrderById,
    startProduction,
    completeProduction,
    cancelProduction
  } = useProductionOrders()

  const [actionLoading, setActionLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId)
    }
  }, [orderId, fetchOrderById])

  // The hook's startProduction/completeProduction/cancelProduction already call
  // fetchOrderById internally, so we don't need to call it again here.
  const handleStartProduction = async () => {
    setActionLoading(true)
    try {
      await startProduction(orderId)
    } catch (error) {
      console.error('Failed to start production:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteProduction = async () => {
    setActionLoading(true)
    try {
      await completeProduction(orderId)
    } catch (error) {
      console.error('Failed to complete production:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelProduction = async () => {
    setActionLoading(true)
    try {
      await cancelProduction(orderId)
      setShowCancelDialog(false)
    } catch (error) {
      console.error('Failed to cancel production:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: ProductionOrderStatus) => {
    const variants: Record<ProductionOrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PLANNED: { variant: 'secondary', label: 'Planned' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStepStatusBadge = (status: ProductionStepStatus) => {
    const variants: Record<ProductionStepStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
      SKIPPED: { variant: 'destructive', label: 'Skipped' },
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Production Order Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The production order you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button onClick={() => router.push('/production/orders')}>
          Back to Orders
        </Button>
      </div>
    )
  }

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
            <h2 className="text-2xl font-bold tracking-tight">
              {currentOrder.order_number}
            </h2>
            <p className="text-muted-foreground">
              Production order details
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentOrder.status === 'PLANNED' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/production/orders/${orderId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleStartProduction} disabled={actionLoading}>
                <Play className="h-4 w-4 mr-2" />
                Start Production
              </Button>
            </>
          )}
          {currentOrder.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCompleteProduction} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="text-lg font-semibold">{currentOrder.product_name}</p>
                <p className="text-xs text-muted-foreground">{currentOrder.product_sku}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="text-2xl font-bold">{currentOrder.quantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <ListChecks className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{Math.round(currentOrder.progress_percentage)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(currentOrder.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Order Number</p>
              <p className="font-medium">{currentOrder.order_number}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Created By</p>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{currentOrder.created_by_name}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Start Date</p>
              <p className="font-medium">
                {currentOrder.start_date
                  ? new Date(currentOrder.start_date).toLocaleString()
                  : 'Not started'
                }
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">End Date</p>
              <p className="font-medium">
                {currentOrder.end_date
                  ? new Date(currentOrder.end_date).toLocaleString()
                  : currentOrder.estimated_completion
                    ? `Est. ${new Date(currentOrder.estimated_completion).toLocaleString()}`
                    : 'Not completed'
                }
              </p>
            </div>

            {currentOrder.duration_days !== null && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">{currentOrder.duration_days} days</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Material Cost</p>
              <p className="font-medium text-lg">
                ${(currentOrder.total_material_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {currentOrder.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm bg-muted p-4 rounded-lg">{currentOrder.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Production Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5" />
            <span>Production Steps ({currentOrder.production_steps?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!currentOrder.production_steps || currentOrder.production_steps.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No production steps defined for this order
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration (hrs)</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrder.production_steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-medium">{step.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{step.description || '-'}</TableCell>
                    <TableCell>{getStepStatusBadge(step.status)}</TableCell>
                    <TableCell>
                      {step.duration_hours ? (
                        <span>
                          {step.duration_hours}
                          {step.actual_duration_hours != null && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (actual: {step.actual_duration_hours.toFixed(1)})
                            </span>
                          )}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{step.assigned_to_name || 'Unassigned'}</TableCell>
                    <TableCell>
                      {step.start_time
                        ? new Date(step.start_time).toLocaleString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {step.end_time
                        ? new Date(step.end_time).toLocaleString()
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Production Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Bill of Materials ({currentOrder.production_materials?.length || 0})</span>
            </div>
            {!currentOrder.materials_sufficient && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Insufficient Stock
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!currentOrder.production_materials || currentOrder.production_materials.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No materials defined for this order
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Required Qty</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrder.production_materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.product_name}</TableCell>
                    <TableCell>{material.product_sku}</TableCell>
                    <TableCell>{material.warehouse_name}</TableCell>
                    <TableCell>{material.quantity}</TableCell>
                    <TableCell>
                      <span className={material.sufficient_stock ? '' : 'text-red-600 font-semibold'}>
                        {material.available_stock}
                      </span>
                    </TableCell>
                    <TableCell>${(material.unit_cost ?? 0).toFixed(2)}</TableCell>
                    <TableCell>${(material.material_cost ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {material.sufficient_stock ? (
                        <Badge variant="outline">Sufficient</Badge>
                      ) : (
                        <Badge variant="destructive">Insufficient</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Production Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this production order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelProduction}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Cancelling...' : 'Yes, cancel order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}