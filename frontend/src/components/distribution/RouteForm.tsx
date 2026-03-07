// src/components/distribution/RouteForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDistribution } from '@/hooks/useDistribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, MapPin, Plus, Trash2, User, Clock } from 'lucide-react';
import type { CreateDeliveryRouteData, DeliveryRouteDetail } from '@/types/distribution.types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const routeStopSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  customer_name: z.string().optional(),
  notes: z.string().optional(),
  sequence_order: z.number().min(1),
});

const routeFormSchema = z.object({
  route_name: z.string().min(1, 'Route name is required'),
  description: z.string().optional(),
  driver_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  start_location: z.string().min(1, 'Start location is required'),
  estimated_duration: z.number().min(1, 'Duration must be at least 1 hour').optional(),
  route_stops: z.array(routeStopSchema).min(1, 'At least one stop is required'),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface RouteFormProps {
  routeId?: string;
  onSuccess?: (route: DeliveryRouteDetail) => void;
  onCancel?: () => void;
}

// Mock data - replace with real data from your hooks
const mockDrivers = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Mike Johnson' },
  { id: '4', name: 'Sarah Wilson' },
];

const mockVehicles = [
  { id: '1', name: 'Van #001 - ABC123' },
  { id: '2', name: 'Truck #002 - XYZ789' },
  { id: '3', name: 'Van #003 - DEF456' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RouteForm: React.FC<RouteFormProps> = ({ 
  routeId, 
  onSuccess, 
  onCancel 
}) => {
  const router = useRouter();
  const { 
    selectedRoute, 
    fetchRoute, 
    createRoute, 
    updateRoute, 
    loading 
  } = useDistribution();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!routeId;

  // ============================================================================
  // FORM CONFIGURATION
  // ============================================================================

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      route_name: '',
      description: '',
      driver_id: '',
      vehicle_id: '',
      start_location: '',
      estimated_duration: 4,
      route_stops: [
        {
          address: '',
          customer_name: '',
          notes: '',
          sequence_order: 1,
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'route_stops',
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load data on mount
  useEffect(() => {
    if (isEditing && routeId) {
      fetchRoute(routeId);
    }
  }, [isEditing, routeId, fetchRoute]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedRoute && selectedRoute.id === routeId) {
      form.reset({
        route_name: selectedRoute.route_name,
        description: selectedRoute.description || '',
        driver_id: selectedRoute.driver_id || '',
        vehicle_id: selectedRoute.vehicle_id || '',
        start_location: selectedRoute.start_location || '',
        estimated_duration: selectedRoute.estimated_duration || 4,
        route_stops: selectedRoute.route_stops?.map((stop, index) => ({
          address: stop.address,
          customer_name: stop.customer_name || '',
          notes: stop.notes || '',
          sequence_order: index + 1,
        })) || [
          {
            address: '',
            customer_name: '',
            notes: '',
            sequence_order: 1,
          }
        ],
      });
    }
  }, [isEditing, selectedRoute, routeId, form]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const onSubmit = async (data: RouteFormData) => {
    setIsSubmitting(true);
    try {
      const routeData: CreateDeliveryRouteData = {
        ...data,
        // Convert empty strings to undefined for optional fields
        description: data.description || undefined,
        driver_id: data.driver_id || undefined,
        vehicle_id: data.vehicle_id || undefined,
        estimated_duration: data.estimated_duration || undefined,
      };

      let result;
      if (isEditing && routeId) {
        result = await updateRoute(routeId, routeData);
      } else {
        result = await createRoute(routeData);
      }

      if (result) {
        onSuccess?.(result);
        if (!onSuccess) {
          router.push('/distribution/routes');
        }
      }
    } catch (error) {
      console.error('Failed to save route:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/distribution/routes');
    }
  };

  const generateRouteName = useCallback(() => {
    const timestamp = Date.now().toString().slice(-4);
    form.setValue('route_name', `Route-${timestamp}`);
  }, [form]);

  const handleAddStop = () => {
    append({
      address: '',
      customer_name: '',
      notes: '',
      sequence_order: fields.length + 1,
    });
  };

  const handleRemoveStop = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      // Reorder remaining stops
      const currentStops = form.getValues('route_stops');
      currentStops.forEach((stop, idx) => {
        if (idx > index) {
          form.setValue(`route_stops.${idx - 1}.sequence_order`, idx);
        }
      });
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading && isEditing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? 'Edit Route' : 'Create New Route'}
            </h2>
            <p className="text-muted-foreground">
              {isEditing ? 'Update route details and stops' : 'Plan a new delivery route'}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Route Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Route Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="route_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Route Name</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input placeholder="Route-001" {...field} />
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={generateRouteName}
                              >
                                Generate
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Duration (hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="start_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Warehouse address or starting point..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Route description or special notes..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="driver_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No driver assigned</SelectItem>
                              {mockDrivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicle_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No vehicle assigned</SelectItem>
                              {mockVehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Route Stops */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Route Stops</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddStop}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stop
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Stop #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStop(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`route_stops.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="123 Main St, City, State" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`route_stops.${index}.customer_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Customer or business name" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name={`route_stops.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Special delivery instructions..." 
                                  rows={2}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Summary & Actions */}
            <div className="space-y-6">
              {/* Route Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Route Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {isEditing && selectedRoute 
                          ? selectedRoute.status 
                          : 'Planned'
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stops:</span>
                      <span className="font-medium">{fields.length}</span>
                    </div>

                    {form.watch('estimated_duration') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{form.watch('estimated_duration')}h</span>
                      </div>
                    )}

                    {form.watch('driver_id') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Driver:</span>
                        <span className="font-medium">
                          {mockDrivers.find(d => d.id === form.watch('driver_id'))?.name || 'Selected'}
                        </span>
                      </div>
                    )}

                    {form.watch('vehicle_id') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vehicle:</span>
                        <span className="font-medium text-xs">
                          {mockVehicles.find(v => v.id === form.watch('vehicle_id'))?.name || 'Selected'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isEditing && selectedRoute && (
                    <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                      <div>Created: {new Date(selectedRoute.created_at).toLocaleDateString()}</div>
                      <div>Updated: {new Date(selectedRoute.updated_at).toLocaleDateString()}</div>
                      {selectedRoute.total_distance && (
                        <div>Distance: {selectedRoute.total_distance} km</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={generateRouteName}
                  >
                    Generate Route Name
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddStop}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stop
                  </Button>
                </CardContent>
              </Card>

              {/* Form Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        isEditing ? 'Update Route' : 'Create Route'
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};