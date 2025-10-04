// src/components/distribution/ShipmentList.tsx
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDistribution } from '@/hooks/useDistribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Trash2, 
  Package,
  PackageCheck,
  Truck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import type { ShipmentList as ShipmentListType, ShipmentStatus, ShipmentFilters } from '@/types/distribution.types';
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

interface ShipmentListProps {
  showActions?: boolean;
  compact?: boolean;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ 
  showActions = true, 
  compact = false 
}) => {
  const router = useRouter();
  const {
    shipments,
    shipmentsLoading,
    shipmentsCount,
    fetchShipments,
    deleteShipment,
    pickShipment,
    packShipment,
    shipShipment,
    deliverShipment,
  } = useDistribution();

  // Local state for filters and actions
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [shipmentToDelete, setShipmentToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load shipments on component mount
  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const filters: ShipmentFilters = {
      search: value || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    };
    fetchShipments(filters);
  }, [statusFilter, fetchShipments]);

  // Handle status filter
  const handleStatusFilter = useCallback((status: ShipmentStatus | 'ALL') => {
    setStatusFilter(status);
    const filters: ShipmentFilters = {
      search: searchTerm || undefined,
      status: status !== 'ALL' ? status : undefined,
    };
    fetchShipments(filters);
  }, [searchTerm, fetchShipments]);

  // Handle shipment workflow actions
  const handlePickShipment = useCallback(async (shipmentId: string) => {
    setActionLoading(shipmentId);
    try {
      await pickShipment(shipmentId);
      await fetchShipments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [pickShipment, fetchShipments, searchTerm, statusFilter]);

  const handlePackShipment = useCallback(async (shipmentId: string) => {
    setActionLoading(shipmentId);
    try {
      await packShipment(shipmentId);
      await fetchShipments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [packShipment, fetchShipments, searchTerm, statusFilter]);

  const handleShipShipment = useCallback(async (shipmentId: string) => {
    setActionLoading(shipmentId);
    try {
      await shipShipment(shipmentId, {
        tracking_number: `TRK-${Date.now()}`,
        carrier: 'Default Carrier',
      });
      await fetchShipments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [shipShipment, fetchShipments, searchTerm, statusFilter]);

  const handleDeliverShipment = useCallback(async (shipmentId: string) => {
    setActionLoading(shipmentId);
    try {
      await deliverShipment(shipmentId);
      await fetchShipments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [deliverShipment, fetchShipments, searchTerm, statusFilter]);

  const handleDeleteShipment = useCallback(async () => {
    if (!shipmentToDelete) return;
    
    try {
      await deleteShipment(shipmentToDelete);
      await fetchShipments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setShipmentToDelete(null);
    }
  }, [shipmentToDelete, deleteShipment, fetchShipments, searchTerm, statusFilter]);

  // Navigation handlers
  const handleViewShipment = useCallback((shipmentId: string) => {
    router.push(`/distribution/shipments/${shipmentId}`);
  }, [router]);

  const handleEditShipment = useCallback((shipmentId: string) => {
    router.push(`/distribution/shipments/${shipmentId}/edit`);
  }, [router]);

  const handleCreateShipment = useCallback(() => {
    router.push('/distribution/shipments/new');
  }, [router]);

  // Render action buttons for each shipment
  const renderShipmentActions = (shipment: ShipmentListType) => {
    const isLoading = actionLoading === shipment.id;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleViewShipment(shipment.id)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {shipment.status !== 'DELIVERED' && (
            <DropdownMenuItem onClick={() => handleEditShipment(shipment.id)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Shipment
            </DropdownMenuItem>
          )}

          {/* Status-specific workflow actions */}
          {shipment.status === 'PENDING' && (
            <DropdownMenuItem onClick={() => handlePickShipment(shipment.id)}>
              <Package className="mr-2 h-4 w-4" />
              Pick Shipment
            </DropdownMenuItem>
          )}

          {shipment.status === 'PICKED' && (
            <DropdownMenuItem onClick={() => handlePackShipment(shipment.id)}>
              <PackageCheck className="mr-2 h-4 w-4" />
              Pack Shipment
            </DropdownMenuItem>
          )}

          {shipment.status === 'PACKED' && (
            <DropdownMenuItem onClick={() => handleShipShipment(shipment.id)}>
              <Truck className="mr-2 h-4 w-4" />
              Ship Shipment
            </DropdownMenuItem>
          )}

          {shipment.status === 'SHIPPED' && (
            <DropdownMenuItem onClick={() => handleDeliverShipment(shipment.id)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Delivered
            </DropdownMenuItem>
          )}

          {shipment.status === 'PENDING' && (
            <DropdownMenuItem 
              onClick={() => setShipmentToDelete(shipment.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Shipment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (shipmentsLoading && shipments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Shipments</h2>
            <p className="text-muted-foreground">
              Manage shipment fulfillment and tracking
            </p>
          </div>
          {showActions && (
            <Button onClick={handleCreateShipment}>
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by shipment number, tracking, or order..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          {!compact && shipments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = shipments.filter(shipment => shipment.status === status).length;
                const StatusIcon = statusIcons[status as ShipmentStatus];
                return (
                  <div key={status} className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shipments Table */}
          {shipments.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No shipments found"
              description="Create your first shipment to get started"
              action={
                showActions ? (
                  <Button onClick={handleCreateShipment}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Shipment
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Created</TableHead>
                    {showActions && <TableHead className="w-[70px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const StatusIcon = statusIcons[shipment.status];
                    return (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          {shipment.shipment_number}
                        </TableCell>
                        <TableCell>
                          {shipment.order_number ? (
                            <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                              {shipment.order_number}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge className={statusColors[shipment.status]}>
                              {statusLabels[shipment.status]}
                            </Badge>
                            {shipment.is_delayed && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{shipment.warehouse_name || 'N/A'}</TableCell>
                        <TableCell>
                          {shipment.tracking_number ? (
                            <div>
                              <div className="font-mono text-sm">{shipment.tracking_number}</div>
                              {shipment.carrier && (
                                <div className="text-xs text-muted-foreground">
                                  via {shipment.carrier}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(shipment.created_at)}</TableCell>
                        {showActions && (
                          <TableCell>
                            {renderShipmentActions(shipment)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Info */}
          {shipments.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {shipments.length} of {shipmentsCount} shipments
              </p>
              {shipmentsLoading && (
                <LoadingSpinner size="sm" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!shipmentToDelete}
        onOpenChange={(open) => !open && setShipmentToDelete(null)}
        title="Delete Shipment"
        description="Are you sure you want to delete this shipment? This action cannot be undone."
        onConfirm={handleDeleteShipment}
        variant="destructive"
      />
    </div>
  );
};