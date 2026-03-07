// src/components/distribution/RouteList.tsx
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDistribution } from '@/hooks/useDistribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Search, MoreHorizontal, Eye, Edit2, Trash2, MapPin, Play, CheckCircle, Clock, Truck, User, AlertCircle } from 'lucide-react';
import type { DeliveryRouteList, RouteStatus, RouteFilters } from '@/types/distribution.types';
import { formatDate } from '@/utils/dateUtils';

// Define route status types and styling
type RouteStatusType = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusColors: Record<RouteStatusType, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<RouteStatusType, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusIcons: Record<RouteStatusType, React.ComponentType<{ className?: string }>> = {
  PLANNED: Clock,
  IN_PROGRESS: Truck,
  COMPLETED: CheckCircle,
  CANCELLED: AlertCircle,
};

interface RouteListProps {
  showActions?: boolean;
  compact?: boolean;
}

export const RouteList: React.FC<RouteListProps> = ({ 
  showActions = true, 
  compact = false 
}) => {
  const router = useRouter();
  const {
    routes,
    routesLoading,
    routesCount,
    fetchRoutes,
    deleteRoute,
    startRoute,
    completeRoute,
  } = useDistribution();

  // Local state for filters and actions
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RouteStatusType | 'ALL'>('ALL');
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load routes on component mount
  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const filters: RouteFilters = {
      search: value || undefined,
      status: statusFilter !== 'ALL' ? statusFilter as RouteStatus : undefined,
    };
    fetchRoutes(filters);
  }, [statusFilter, fetchRoutes]);

  // Handle status filter
  const handleStatusFilter = useCallback((status: RouteStatusType | 'ALL') => {
    setStatusFilter(status);
    const filters: RouteFilters = {
      search: searchTerm || undefined,
      status: status !== 'ALL' ? status as RouteStatus : undefined,
    };
    fetchRoutes(filters);
  }, [searchTerm, fetchRoutes]);

  // Handle route workflow actions
  const handleStartRoute = useCallback(async (routeId: string) => {
    setActionLoading(routeId);
    try {
      await startRoute(routeId);
      await fetchRoutes({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter as RouteStatus : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [startRoute, fetchRoutes, searchTerm, statusFilter]);

  const handleCompleteRoute = useCallback(async (routeId: string) => {
    setActionLoading(routeId);
    try {
      await completeRoute(routeId);
      await fetchRoutes({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter as RouteStatus : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  }, [completeRoute, fetchRoutes, searchTerm, statusFilter]);

  const handleDeleteRoute = useCallback(async () => {
    if (!routeToDelete) return;
    
    try {
      await deleteRoute(routeToDelete);
      await fetchRoutes({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter as RouteStatus : undefined,
      });
    } finally {
      setRouteToDelete(null);
    }
  }, [routeToDelete, deleteRoute, fetchRoutes, searchTerm, statusFilter]);

  // Navigation handlers
  const handleViewRoute = useCallback((routeId: string) => {
    router.push(`/distribution/routes/${routeId}`);
  }, [router]);

  const handleEditRoute = useCallback((routeId: string) => {
    router.push(`/distribution/routes/${routeId}/edit`);
  }, [router]);

  const handleCreateRoute = useCallback(() => {
    router.push('/distribution/routes/new');
  }, [router]);

  // Render action buttons for each route
  const renderRouteActions = (route: DeliveryRouteList) => {
    const isLoading = actionLoading === route.id;
    
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
          <DropdownMenuItem onClick={() => handleViewRoute(route.id)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
            <DropdownMenuItem onClick={() => handleEditRoute(route.id)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Route
            </DropdownMenuItem>
          )}

          {/* Status-specific workflow actions */}
          {route.status === 'PLANNED' && (
            <DropdownMenuItem onClick={() => handleStartRoute(route.id)}>
              <Play className="mr-2 h-4 w-4" />
              Start Route
            </DropdownMenuItem>
          )}

          {route.status === 'IN_PROGRESS' && (
            <DropdownMenuItem onClick={() => handleCompleteRoute(route.id)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Route
            </DropdownMenuItem>
          )}

          {route.status === 'PLANNED' && (
            <DropdownMenuItem 
              onClick={() => setRouteToDelete(route.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Route
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (routesLoading && routes.length === 0) {
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
            <h2 className="text-2xl font-bold">Delivery Routes</h2>
            <p className="text-muted-foreground">
              Plan and manage delivery routes for optimal efficiency
            </p>
          </div>
          {showActions && (
            <Button onClick={handleCreateRoute}>
              <Plus className="mr-2 h-4 w-4" />
              New Route
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
                placeholder="Search by route name, driver, or destination..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => handleStatusFilter(v as RouteStatusType | 'ALL')}
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
          {!compact && routes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = routes.filter(route => route.status === status).length;
                const StatusIcon = statusIcons[status as RouteStatusType];
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

          {/* Routes Table */}
          {routes.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title="No routes found"
              description="Create your first delivery route to get started"
              action={
                showActions ? (
                  <Button onClick={handleCreateRoute}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Route
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Date</TableHead>
                    {showActions && <TableHead className="w-[70px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => {
                    const StatusIcon = statusIcons[route.status as RouteStatusType];
                    return (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{route.route_name}</div>
                            {route.description && (
                              <div className="text-sm text-muted-foreground">
                                {route.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {route.driver_name ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {route.driver_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge className={statusColors[route.status as RouteStatusType]}>
                              {statusLabels[route.status as RouteStatusType]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {route.stop_count || 0} stops
                          </div>
                        </TableCell>
                        <TableCell>
                          {route.total_distance ? (
                            `${route.total_distance} km`
                          ) : (
                            <span className="text-muted-foreground">Not calculated</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(route.created_at)}</TableCell>
                        {showActions && (
                          <TableCell>
                            {renderRouteActions(route)}
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
          {routes.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {routes.length} of {routesCount} routes
              </p>
              {routesLoading && (
                <LoadingSpinner size="sm" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!routeToDelete}
        onOpenChange={(open) => !open && setRouteToDelete(null)}
        title="Delete Route"
        description="Are you sure you want to delete this route? This action cannot be undone."
        onConfirm={handleDeleteRoute}
        variant="destructive"
      />
    </div>
  );
};