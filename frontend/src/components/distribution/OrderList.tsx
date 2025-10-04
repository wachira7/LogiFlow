// src/components/distribution/OrderList.tsx
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
  Truck,
  X
} from 'lucide-react';
import type { CustomerOrderList, OrderStatus, OrderFilters } from '@/types/distribution.types';
import { formatCurrency, formatDate } from '@/utils/dateUtils';

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

interface OrderListProps {
  showActions?: boolean;
  compact?: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({ 
  showActions = true, 
  compact = false 
}) => {
  const router = useRouter();
  const {
    orders,
    ordersLoading,
    ordersCount,
    fetchOrders,
    deleteOrder,
    processOrder,
    shipOrder,
    cancelOrder,
  } = useDistribution();

  // Local state for filters and actions
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const filters: OrderFilters = {
      search: value || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    };
    fetchOrders(filters);
  }, [statusFilter, fetchOrders]);

  // Handle status filter
  const handleStatusFilter = useCallback((status: OrderStatus | 'ALL') => {
    setStatusFilter(status);
    const filters: OrderFilters = {
      search: searchTerm || undefined,
      status: status !== 'ALL' ? status : undefined,
    };
    fetchOrders(filters);
  }, [searchTerm, fetchOrders]);

  // Handle order actions
  const handleProcessOrder = useCallback(async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await processOrder(orderId);
      // Refresh the list
      await fetchOrders({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [processOrder, fetchOrders, searchTerm, statusFilter]);

  const handleShipOrder = useCallback(async (orderId: string) => {
    // For now, we'll need a warehouse ID - in real implementation, 
    // this would open a dialog to select warehouse
    const defaultWarehouseId = 'default-warehouse-id';
    setActionLoading(orderId);
    try {
      await shipOrder(orderId, { warehouse_id: defaultWarehouseId });
      await fetchOrders({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [shipOrder, fetchOrders, searchTerm, statusFilter]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await cancelOrder(orderId);
      await fetchOrders({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [cancelOrder, fetchOrders, searchTerm, statusFilter]);

  const handleDeleteOrder = useCallback(async () => {
    if (!orderToDelete) return;
    
    try {
      await deleteOrder(orderToDelete);
      await fetchOrders({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
    } finally {
      setOrderToDelete(null);
    }
  }, [orderToDelete, deleteOrder, fetchOrders, searchTerm, statusFilter]);

  // Navigation handlers
  const handleViewOrder = useCallback((orderId: string) => {
    router.push(`/distribution/orders/${orderId}`);
  }, [router]);

  const handleEditOrder = useCallback((orderId: string) => {
    router.push(`/distribution/orders/${orderId}/edit`);
  }, [router]);

  const handleCreateOrder = useCallback(() => {
    router.push('/distribution/orders/new');
  }, [router]);

  // Render action buttons for each order
  const renderOrderActions = (order: CustomerOrderList) => {
    const isLoading = actionLoading === order.id;
    
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
          <DropdownMenuItem onClick={() => handleViewOrder(order.id)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Order
            </DropdownMenuItem>
          )}

          {/* Status-specific actions */}
          {order.status === 'NEW' && (
            <DropdownMenuItem onClick={() => handleProcessOrder(order.id)}>
              <Package className="mr-2 h-4 w-4" />
              Process Order
            </DropdownMenuItem>
          )}

          {order.status === 'PROCESSING' && (
            <DropdownMenuItem onClick={() => handleShipOrder(order.id)}>
              <Truck className="mr-2 h-4 w-4" />
              Ship Order
            </DropdownMenuItem>
          )}

          {(order.status === 'NEW' || order.status === 'PROCESSING') && (
            <DropdownMenuItem 
              onClick={() => handleCancelOrder(order.id)}
              className="text-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Order
            </DropdownMenuItem>
          )}

          {order.status === 'NEW' && (
            <DropdownMenuItem 
              onClick={() => setOrderToDelete(order.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Order
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (ordersLoading && orders.length === 0) {
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
            <h2 className="text-2xl font-bold">Customer Orders</h2>
            <p className="text-muted-foreground">
              Manage customer orders and fulfillment
            </p>
          </div>
          {showActions && (
            <Button onClick={handleCreateOrder}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
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
                placeholder="Search orders by number, customer name, or email..."
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
          {!compact && orders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = orders.filter(order => order.status === status).length;
                return (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Orders Table */}
          {orders.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No orders found"
              description="Create your first customer order to get started"
              action={
                showActions ? (
                  <Button onClick={handleCreateOrder}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Order
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    {showActions && <TableHead className="w-[70px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.item_count}</TableCell>
                      <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      {showActions && (
                        <TableCell>
                          {renderOrderActions(order)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Info */}
          {orders.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {orders.length} of {ordersCount} orders
              </p>
              {ordersLoading && (
                <LoadingSpinner size="sm" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
        title="Delete Order"
        description="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={handleDeleteOrder}
      />
    </div>
  );
};