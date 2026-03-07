
// src/app/distribution/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDistribution } from '@/hooks/useDistribution';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit2, Package, Truck, X, Trash2, Calendar, Mail, Phone, MapPin } from 'lucide-react';
import type { OrderStatus } from '@/types/distribution.types';
import { formatCurrency, formatDate } from '@/utils/dateUtils';
import { WarehouseSelectDialog } from '@/components/distribution/WarehouseSelectDialog';

const statusColors: Record<OrderStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: 'New',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const {
    selectedOrder,
    fetchOrder,
    deleteOrder,
    processOrder,
    shipOrder,
    cancelOrder,
    loading,
  } = useDistribution();

  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    }
  }, [orderId, fetchOrder]);

  const handleBack = () => {
    router.push('/distribution/orders');
  };

  const handleEdit = () => {
    router.push(`/distribution/orders/${orderId}/edit`);
  };

  const handleProcess = async () => {
    setActionLoading(true);
    try {
      await processOrder(orderId);
      await fetchOrder(orderId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShip = async (warehouseId: string) => {
    setActionLoading(true);
    try {
      await shipOrder(orderId, { warehouse_id: warehouseId });
      await fetchOrder(orderId);
    } finally {
      setActionLoading(false);
    }
  };
  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await cancelOrder(orderId);
      await fetchOrder(orderId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrder(orderId);
      router.push('/distribution/orders');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (loading || !selectedOrder) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = selectedOrder;
  const canEdit = order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
  const canProcess = order.status === 'NEW';
  const canShip = order.status === 'PROCESSING' && order.can_be_shipped;
  const canCancel = order.status === 'NEW' || order.status === 'PROCESSING';
  const canDelete = order.status === 'NEW';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(order.created_at)}
              </div>
              <Badge className={statusColors[order.status]}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {canEdit && (
            <Button variant="outline" onClick={handleEdit} disabled={actionLoading}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {canProcess && (
            <Button onClick={handleProcess} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Process Order
            </Button>
          )}

          {canShip && (
            <Button onClick={() => setShowWarehouseDialog(true)} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Ship Order
            </Button>
          )}

          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Cancel Order
            </Button>
          )}

          {canDelete && (
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)}
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">{order.customer_name}</h4>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Mail className="h-4 w-4 mr-2" />
                    {order.customer_email}
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Phone className="h-4 w-4 mr-2" />
                      {order.customer_phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                  <h5 className="font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Shipping Address
                  </h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.shipping_address}
                  </p>
                </div>

                {order.billing_address && (
                  <div>
                    <h5 className="font-medium mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Billing Address
                    </h5>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {order.billing_address}
                    </p>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2">Notes</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.product_sku}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Items ({order.item_count}):</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>

              {order.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}

              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>{formatCurrency(order.shipping_amount)}</span>
                </div>
              )}

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total:</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(order.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={statusColors[order.status]}>
                  {statusLabels[order.status]}
                </Badge>
              </div>
              {order.can_be_shipped && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ready to Ship:</span>
                  <span className="text-green-600">Yes</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Order"
        description="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={handleDelete}
      />
      <WarehouseSelectDialog
        open={showWarehouseDialog}
        onOpenChange={setShowWarehouseDialog}
        onConfirm={handleShip}
      />
    </div>
  );
}