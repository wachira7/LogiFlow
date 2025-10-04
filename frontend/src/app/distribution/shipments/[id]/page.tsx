// src/app/distribution/shipments/[id]/page.tsx
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
import { ArrowLeft, Edit2, Package, PackageCheck, Truck, CheckCircle, Trash2, Calendar, User, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ShipmentStatus } from '@/types/distribution.types';
import { formatDate } from '@/utils/dateUtils';

const statusColors: Record<ShipmentStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  PICKED: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<ShipmentStatus, string> = {
  PENDING: 'Pending',
  PICKED: 'Picked',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
};

const statusIcons: Record<ShipmentStatus, React.ComponentType<{ className?: string }>> = {
  PENDING: Package,
  PICKED: Package,
  PACKED: PackageCheck,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
};

export default function ShipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;
  
  const {
    selectedShipment,
    fetchShipment,
    deleteShipment,
    pickShipment,
    packShipment,
    shipShipment,
    deliverShipment,
    loading,
  } = useDistribution();

  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (shipmentId) {
      fetchShipment(shipmentId);
    }
  }, [shipmentId, fetchShipment]);

  const handleBack = () => {
    router.push('/distribution/shipments');
  };

  const handleEdit = () => {
    router.push(`/distribution/shipments/${shipmentId}/edit`);
  };

  const handleViewOrder = () => {
    if (selectedShipment?.order_id) {
      router.push(`/distribution/orders/${selectedShipment.order_id}`);
    }
  };

  // Workflow action handlers
  const handlePick = async () => {
    setActionLoading(true);
    try {
      await pickShipment(shipmentId);
      await fetchShipment(shipmentId);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePack = async () => {
    setActionLoading(true);
    try {
      await packShipment(shipmentId);
      await fetchShipment(shipmentId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShip = async () => {
    // In a real implementation, this would open a dialog for shipping details
    setActionLoading(true);
    try {
      await shipShipment(shipmentId, {
        tracking_number: `TRK-${Date.now()}`,
        carrier: 'Default Carrier',
      });
      await fetchShipment(shipmentId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    setActionLoading(true);
    try {
      await deliverShipment(shipmentId);
      await fetchShipment(shipmentId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteShipment(shipmentId);
      router.push('/distribution/shipments');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (loading || !selectedShipment) {
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

  const shipment = selectedShipment;
  const StatusIcon = statusIcons[shipment.status];
  
  const canEdit = shipment.status !== 'DELIVERED';
  const canPick = shipment.status === 'PENDING';
  const canPack = shipment.status === 'PICKED';
  const canShip = shipment.status === 'PACKED';
  const canDeliver = shipment.status === 'SHIPPED';
  const canDelete = shipment.status === 'PENDING';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Shipment {shipment.shipment_number}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(shipment.created_at)}
              </div>
              <div className="flex items-center">
                <StatusIcon className="h-4 w-4 mr-1" />
                <Badge className={statusColors[shipment.status]}>
                  {statusLabels[shipment.status]}
                </Badge>
              </div>
              {shipment.is_delayed && (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Delayed
                </div>
              )}
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

          {canPick && (
            <Button onClick={handlePick} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Pick Shipment
            </Button>
          )}

          {canPack && (
            <Button onClick={handlePack} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <PackageCheck className="h-4 w-4 mr-2" />
              )}
              Pack Shipment
            </Button>
          )}

          {canShip && (
            <Button onClick={handleShip} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Ship Shipment
            </Button>
          )}

          {canDeliver && (
            <Button onClick={handleDeliver} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Delivered
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipment #:</span>
                      <span className="font-mono">{shipment.shipment_number}</span>
                    </div>
                    {shipment.order_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order:</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-blue-600"
                          onClick={handleViewOrder}
                        >
                          {shipment.order_number}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warehouse:</span>
                      <span>{shipment.warehouse_name}</span>
                    </div>
                    {shipment.driver_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center">
                          <User className="h-4 w-4 mr-1" /> Driver: </span>
                        <span>{shipment.driver_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Shipping Details</h4>
                  <div className="space-y-2 text-sm">
                    {shipment.carrier && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span>{shipment.carrier}</span>
                      </div>
                    )}
                    {shipment.tracking_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking #:</span>
                        <span className="font-mono">{shipment.tracking_number}</span>
                      </div>
                    )}
                    {shipment.shipping_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ship Date:</span>
                        <span>{formatDate(shipment.shipping_date)}</span>
                      </div>
                    )}
                    {shipment.estimated_delivery && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Delivery:</span>
                        <span>{formatDate(shipment.estimated_delivery)}</span>
                      </div>
                    )}
                    {shipment.actual_delivery && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivered:</span>
                        <span>{formatDate(shipment.actual_delivery)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {shipment.vehicle_info && (
                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2 flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Vehicle Information
                  </h5>
                  <p className="text-sm text-muted-foreground">{shipment.vehicle_info}</p>
                </div>
              )}

              {shipment.notes && (
                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2">Notes</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {shipment.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipment Items */}
          {shipment.shipment_items && shipment.shipment_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipment.shipment_items.map((item) => (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'] as ShipmentStatus[]).map((status, index) => {
                  const StatusStepIcon = statusIcons[status];
                  const isCompleted = ['PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(shipment.status) 
                    && index <= ['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'].indexOf(shipment.status);
                  const isCurrent = shipment.status === status;
                  
                  return (
                    <div key={status} className="flex items-center space-x-3">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full border-2
                        ${isCurrent 
                          ? 'bg-blue-100 border-blue-500 text-blue-600' 
                          : isCompleted 
                            ? 'bg-green-100 border-green-500 text-green-600'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }
                      `}>
                        <StatusStepIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {statusLabels[status]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Shipment Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(shipment.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(shipment.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center">
                  <StatusIcon className="h-4 w-4 mr-1" />
                  <Badge className={statusColors[shipment.status]}>
                    {statusLabels[shipment.status]}
                  </Badge>
                </div>
              </div>
              {shipment.delivery_days && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Time:</span>
                  <span>{shipment.delivery_days} days</span>
                </div>
              )}
              {shipment.is_delayed && (
                <div className="flex justify-between text-red-600">
                  <span>Status:</span>
                  <span className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Delayed
                  </span>
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
        title="Delete Shipment"
        description="Are you sure you want to delete this shipment? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
