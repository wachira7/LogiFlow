// src/app/distribution/routes/[id]/page.tsx
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
import { ArrowLeft, Edit2, MapPin, Play, CheckCircle, Trash2, Calendar, User, Truck, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PLANNED: Clock,
  IN_PROGRESS: Truck,
  COMPLETED: CheckCircle,
  CANCELLED: AlertTriangle,
};

export default function RouteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;
  
  const {
    selectedRoute,
    fetchRoute,
    deleteRoute,
    startRoute,
    completeRoute,
    loading,
  } = useDistribution();

  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (routeId) {
      fetchRoute(routeId);
    }
  }, [routeId, fetchRoute]);

  const handleBack = () => {
    router.push('/distribution/routes');
  };

  const handleEdit = () => {
    router.push(`/distribution/routes/${routeId}/edit`);
  };

  // Workflow action handlers
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startRoute(routeId);
      await fetchRoute(routeId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await completeRoute(routeId);
      await fetchRoute(routeId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRoute(routeId);
      router.push('/distribution/routes');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (loading || !selectedRoute) {
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

  const route = selectedRoute;
  const StatusIcon = statusIcons[route.status];
  
  const canEdit = route.status !== 'COMPLETED' && route.status !== 'CANCELLED';
  const canStart = route.status === 'PLANNED';
  const canComplete = route.status === 'IN_PROGRESS';
  const canDelete = route.status === 'PLANNED';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{route.route_name}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(route.created_at)}
              </div>
              <div className="flex items-center">
                <StatusIcon className="h-4 w-4 mr-1" />
                <Badge className={statusColors[route.status]}>
                  {statusLabels[route.status]}
                </Badge>
              </div>
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

          {canStart && (
            <Button onClick={handleStart} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Route
            </Button>
          )}

          {canComplete && (
            <Button onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Complete Route
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
          {/* Route Information */}
          <Card>
            <CardHeader>
              <CardTitle>Route Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route Name:</span>
                      <span className="font-medium">{route.route_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={statusColors[route.status]}>
                        {statusLabels[route.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stops:</span>
                      <span>{route.stop_count || 0}</span>
                    </div>
                    {route.total_distance && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance:</span>
                        <span>{route.total_distance} km</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Assignment</h4>
                  <div className="space-y-2 text-sm">
                    {route.driver_name ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Driver:</span>
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {route.driver_name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Driver:</span>
                        <span>Not assigned</span>
                      </div>
                    )}
                    {route.estimated_duration && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{route.estimated_duration}h</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {route.start_location && (
                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Start Location
                  </h5>
                  <p className="text-sm text-muted-foreground">{route.start_location}</p>
                </div>
              )}

              {route.description && (
                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2">Description</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {route.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Stops */}
          {route.route_stops && route.route_stops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Route Stops</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stop #</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {route.route_stops.map((stop, index) => (
                        <TableRow key={stop.id || index}>
                          <TableCell className="font-medium">
                            {stop.stop_number || index + 1}
                          </TableCell>
                          <TableCell>{stop.address}</TableCell>
                          <TableCell>
                            {stop.customer_name || (
                              <span className="text-muted-foreground">No customer</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {stop.status || 'Pending'}
                            </Badge>
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
                {['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((status, index) => {
                  const StatusStepIcon = statusIcons[status];
                  const isCompleted = ['IN_PROGRESS', 'COMPLETED'].includes(route.status) 
                    && index < ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].indexOf(route.status) + 1;
                  const isCurrent = route.status === status;
                  
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

          {/* Route Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Route Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(route.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(route.updated_at)}</span>
              </div>
              {route.start_time && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{formatDate(route.start_time)}</span>
                </div>
              )}
              {route.end_time && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{formatDate(route.end_time)}</span>
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
        title="Delete Route"
        description="Are you sure you want to delete this route? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

