// src/components/distribution/TrackingDashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { useDistribution } from '@/hooks/useDistribution';
import type { ShipmentStatus } from '@/types/distribution.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Truck, MapPin, Clock, CheckCircle, AlertTriangle, BarChart3, Eye, ExternalLink } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { DeliveryStatus } from './DeliveryStatus';

interface TrackingDashboardProps {
  customerView?: boolean;
}

interface TrackingResult {
  id: string;
  type: 'order' | 'shipment' | 'route';
  tracking_number: string;
  status_label: string;
  customer_info: string;
  created_at: string;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  customerView = false
}) => {
  const {
    orders,
    shipments,
    routes,
    ordersLoading,
    shipmentsLoading,
    routesLoading,
    fetchOrders,
    fetchShipments,
    fetchRoutes,
    fetchShipmentTrackingReport,
    shipmentReport
  } = useDistribution();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingResults, setTrackingResults] = useState<TrackingResult[]>([]);

  useEffect(() => {
    if (!customerView) {
      fetchOrders();
      fetchShipments();
      fetchRoutes();
      fetchShipmentTrackingReport();
    }
  }, [customerView, fetchOrders, fetchShipments, fetchRoutes, fetchShipmentTrackingReport]);

  const handleSearch = useCallback(async (searchValue: string) => {
    setSearchTerm(searchValue);
    if (!searchValue.trim()) {
      setTrackingResults([]);
      return;
    }

    // Search across orders, shipments, and routes
    const results = [];
    
    // Search orders
    const matchingOrders = orders.filter(order => 
      order.order_number.toLowerCase().includes(searchValue.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchValue.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchValue.toLowerCase())
    );

    results.push(...matchingOrders.map(order => ({
      ...order,
      type: 'order' as const,
      tracking_number: order.order_number,
      status_label: order.status,
      customer_info: `${order.customer_name} (${order.customer_email})`
    })));

    // Search shipments  
    const matchingShipments = shipments.filter(shipment =>
      (shipment.shipment_number?.toLowerCase().includes(searchValue.toLowerCase())) ||
      (shipment.tracking_number?.toLowerCase().includes(searchValue.toLowerCase())) ||
      (shipment.order_number?.toLowerCase().includes(searchValue.toLowerCase()))
    );

    results.push(...matchingShipments.map(shipment => ({
      ...shipment,
      type: 'shipment' as const,
      tracking_number: shipment.tracking_number || shipment.shipment_number,
      status_label: shipment.status,
      customer_info: shipment.order_number ? `Order: ${shipment.order_number}` : 'Manual Shipment'
    })));

    // Search routes
    const matchingRoutes = routes.filter(route =>
      route.route_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (route.driver_name?.toLowerCase().includes(searchValue.toLowerCase()))
    );

    results.push(...matchingRoutes.map(route => ({
      ...route,
      type: 'route' as const,
      tracking_number: route.route_name,
      status_label: route.status,
      customer_info: route.driver_name ? `Driver: ${route.driver_name}` : 'No driver assigned'
    })));

    setTrackingResults(results);
  }, [orders, shipments, routes]);

 const getStatusColor = (status: string, type: string) => {
  // Provide context-specific colors based on entity type
  if (type === 'order') {
    const orderColors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return orderColors[status] || 'bg-gray-100 text-gray-800';
  } else if (type === 'shipment') {
    const shipmentColors: Record<string, string> = {
      PENDING: 'bg-slate-100 text-slate-800',
      PICKED: 'bg-cyan-100 text-cyan-800',
      PACKED: 'bg-amber-100 text-amber-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-emerald-100 text-emerald-800',
    };
    return shipmentColors[status] || 'bg-gray-100 text-gray-800';
  } else if (type === 'route') {
    const routeColors: Record<string, string> = {
      PLANNED: 'bg-sky-100 text-sky-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-teal-100 text-teal-800',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return routeColors[status] || 'bg-gray-100 text-gray-800';
  }
  
  // Fallback
  return 'bg-gray-100 text-gray-800';
};

  const getStatusIcon = (status: string, type: string) => {
    if (type === 'order') {
      const icons: Record<string, React.ComponentType<{ className?: string }>> = {
        NEW: Package,
        PROCESSING: Clock,
        SHIPPED: Truck,
        DELIVERED: CheckCircle,
        CANCELLED: AlertTriangle,
      };
      return icons[status] || Package;
    } else if (type === 'shipment') {
      const icons: Record<string, React.ComponentType<{ className?: string }>> = {
        PENDING: Package,
        PICKED: Package,
        PACKED: Package,
        SHIPPED: Truck,
        DELIVERED: CheckCircle,
      };
      return icons[status] || Package;
    } else if (type === 'route') {
      const icons: Record<string, React.ComponentType<{ className?: string }>> = {
        PLANNED: MapPin,
        IN_PROGRESS: Truck,
        COMPLETED: CheckCircle,
        CANCELLED: AlertTriangle,
      };
      return icons[status] || MapPin;
    }
    return Package;
  };

  const renderOverviewStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Orders</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => ['NEW', 'PROCESSING'].includes(o.status)).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold">
                {shipments.filter(s => ['PICKED', 'PACKED', 'SHIPPED'].includes(s.status)).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Routes</p>
              <p className="text-2xl font-bold">
                {routes.filter(r => r.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Delivered Today</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.status === 'DELIVERED').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSearchResults = () => (
    <Card>
      <CardHeader>
        <CardTitle>Tracking Results</CardTitle>
      </CardHeader>
      <CardContent>
        {trackingResults.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="No tracking results"
            description="Enter an order number, tracking number, or customer email to search"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer/Info</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingResults.map((result) => {
                  return (
                    <TableRow key={`${result.type}-${result.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {result.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {result.tracking_number}
                      </TableCell>
                      <TableCell>
                        {result.type === 'shipment' ? (
                          <DeliveryStatus
                            status={result.status_label as ShipmentStatus}
                            compact
                          />
                        ) : (
                          <Badge className={getStatusColor(result.status_label, result.type)}>
                            {result.status_label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{result.customer_info}</TableCell>
                      <TableCell>{formatDate(result.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderRecentActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Recent orders */}
          {orders.slice(0, 5).map((order) => {
            const StatusIcon = getStatusIcon(order.status, 'order');
            return (
              <div key={order.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                <StatusIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                </div>
                <Badge className={getStatusColor(order.status, 'order')}>
                  {order.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(order.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderPerformanceMetrics = () => {
    if (!shipmentReport) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {shipmentReport.on_time_percentage}%
              </p>
              <p className="text-sm text-muted-foreground">On-time Delivery</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {shipmentReport.average_delivery_days}
              </p>
              <p className="text-sm text-muted-foreground">Avg. Delivery Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {shipmentReport.total_shipments}
              </p>
              <p className="text-sm text-muted-foreground">Total Shipments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (ordersLoading || shipmentsLoading || routesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {customerView ? 'Track Your Order' : 'Distribution Tracking'}
          </h2>
          <p className="text-muted-foreground">
            {customerView 
              ? 'Enter your order or tracking number to get real-time updates'
              : 'Monitor orders, shipments, and routes in real-time'
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={customerView 
                  ? "Enter order number, tracking number, or email..." 
                  : "Search orders, shipments, or routes..."
                }
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {customerView ? (
        /* Customer View - Show search results */
        renderSearchResults()
      ) : (
        /* Internal View - Show full dashboard */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="search">Search & Track</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderOverviewStats()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderRecentActivity()}
              {renderPerformanceMetrics()}
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            {renderSearchResults()}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {renderRecentActivity()}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            {renderPerformanceMetrics()}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries({
                      'Delivered': orders.filter(o => o.status === 'DELIVERED').length,
                      'Shipped': orders.filter(o => o.status === 'SHIPPED').length,
                      'Processing': orders.filter(o => o.status === 'PROCESSING').length,
                      'New': orders.filter(o => o.status === 'NEW').length,
                    }).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Route Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries({
                      'Completed': routes.filter(r => r.status === 'COMPLETED').length,
                      'In Progress': routes.filter(r => r.status === 'IN_PROGRESS').length,
                      'Planned': routes.filter(r => r.status === 'PLANNED').length,
                    }).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};