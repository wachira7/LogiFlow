// src/components/distribution/ShipmentForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDistribution } from '@/hooks/useDistribution';
import { useWarehouses } from '@/hooks/useInventory';
import type { Warehouse } from '@/types/inventory.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  ArrowLeft,
  Package,
  Truck,
  MapPin 
} from 'lucide-react';
import type { CreateShipmentData, ShipmentDetail } from '@/types/distribution.types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const shipmentFormSchema = z.object({
  shipment_number: z.string().min(1, 'Shipment number is required'),
  order_id: z.string().optional(),
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  driver_id: z.string().optional(),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  estimated_delivery: z.string().optional(),
  vehicle_info: z.string().optional(),
  notes: z.string().optional(),
});

type ShipmentFormData = z.infer<typeof shipmentFormSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface ShipmentFormProps {
  shipmentId?: string;
  orderId?: string; // Pre-fill from order
  onSuccess?: (shipment: ShipmentDetail) => void;
  onCancel?: () => void;
}

// Mock data - replace with real data from your hooks
const mockDrivers = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Mike Johnson' },
];

const mockCarriers = [
  'FedEx',
  'UPS',
  'DHL',
  'USPS',
  'Own Fleet',
  'Third Party',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ 
  shipmentId, 
  orderId,
  onSuccess, 
  onCancel 
}) => {
  const router = useRouter();
  const { 
    selectedShipment, 
    fetchShipment, 
    createShipment, 
    updateShipment, 
    loading,
    orders,
    fetchOrders,
  } = useDistribution();
  
  const { warehouses, refresh: fetchWarehouses } = useWarehouses();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!shipmentId;

  // ============================================================================
  // FORM CONFIGURATION
  // ============================================================================

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: {
      shipment_number: '',
      order_id: orderId || '',
      warehouse_id: '',
      driver_id: '',
      carrier: '',
      tracking_number: '',
      estimated_delivery: '',
      vehicle_info: '',
      notes: '',
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load data on mount
  useEffect(() => {
    fetchOrders();
    fetchWarehouses();
    if (isEditing && shipmentId) {
      fetchShipment(shipmentId);
    }
  }, [isEditing, shipmentId, fetchShipment, fetchOrders, fetchWarehouses]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedShipment && selectedShipment.id === shipmentId) {
      form.reset({
        shipment_number: selectedShipment.shipment_number,
        order_id: selectedShipment.order_id || '',
        warehouse_id: selectedShipment.warehouse_id,
        driver_id: selectedShipment.driver_id || '',
        carrier: selectedShipment.carrier || '',
        tracking_number: selectedShipment.tracking_number || '',
        estimated_delivery: selectedShipment.estimated_delivery 
          ? new Date(selectedShipment.estimated_delivery).toISOString().split('T')[0] 
          : '',
        vehicle_info: selectedShipment.vehicle_info || '',
        notes: selectedShipment.notes || '',
      });
    }
  }, [isEditing, selectedShipment, shipmentId, form]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const onSubmit = async (data: ShipmentFormData) => {
    setIsSubmitting(true);
    try {
      const shipmentData: CreateShipmentData = {
        ...data,
        // Convert empty strings to undefined for optional fields
        order_id: data.order_id || undefined,
        driver_id: data.driver_id || undefined,
        estimated_delivery: data.estimated_delivery || undefined,
      };

      let result;
      if (isEditing && shipmentId) {
        result = await updateShipment(shipmentId, shipmentData);
      } else {
        result = await createShipment(shipmentData);
      }

      if (result) {
        onSuccess?.(result);
        if (!onSuccess) {
          router.push('/distribution/shipments');
        }
      }
    } catch (error) {
      console.error('Failed to save shipment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/distribution/shipments');
    }
  };

  const generateShipmentNumber = useCallback(() => {
    const timestamp = Date.now().toString().slice(-6);
    form.setValue('shipment_number', `SH-${timestamp}`);
  }, [form]);

  const generateTrackingNumber = useCallback(() => {
    const timestamp = Date.now().toString();
    form.setValue('tracking_number', `TRK-${timestamp}`);
  }, [form]);

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
              {isEditing ? 'Edit Shipment' : 'Create New Shipment'}
            </h2>
            <p className="text-muted-foreground">
              {isEditing ? 'Update shipment details' : 'Fill in the shipment information'}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Shipment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Shipment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipment_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipment Number</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input placeholder="SH-001" {...field} />
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={generateShipmentNumber}
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
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Order (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select order" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No order</SelectItem>
                              {orders.map((order) => (
                                <SelectItem key={order.id} value={order.id}>
                                  {order.order_number} - {order.customer_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="warehouse_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select warehouse" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
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
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional shipment notes..." 
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

              {/* Shipping & Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Shipping & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="carrier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carrier</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select carrier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No carrier</SelectItem>
                              {mockCarriers.map((carrier) => (
                                <SelectItem key={carrier} value={carrier}>
                                  {carrier}
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
                      name="tracking_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tracking Number</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input placeholder="TRK-12345" {...field} />
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={generateTrackingNumber}
                              >
                                Generate
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimated_delivery"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Delivery Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicle_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Info</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="License plate, vehicle type..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Summary & Actions */}
            <div className="space-y-6">
              {/* Shipment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Shipment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {isEditing && selectedShipment 
                          ? selectedShipment.status 
                          : 'Pending'
                        }
                      </span>
                    </div>
                    
                    {form.watch('order_id') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order:</span>
                        <span className="font-medium">
                          {orders.find(o => o.id === form.watch('order_id'))?.order_number || 'Selected'}
                        </span>
                      </div>
                    )}

                    {form.watch('warehouse_id') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Warehouse:</span>
                        <span className="font-medium">
                          {warehouses.find((w: Warehouse) => w.id === form.watch('warehouse_id'))?.name || 'Selected'}
                        </span>
                      </div>
                    )}

                    {form.watch('carrier') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span className="font-medium">{form.watch('carrier')}</span>
                      </div>
                    )}

                    {form.watch('tracking_number') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking:</span>
                        <span className="font-mono text-xs">{form.watch('tracking_number')}</span>
                      </div>
                    )}
                  </div>

                  {isEditing && selectedShipment && (
                    <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                      <div>Created: {new Date(selectedShipment.created_at).toLocaleDateString()}</div>
                      <div>Updated: {new Date(selectedShipment.updated_at).toLocaleDateString()}</div>
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
                    onClick={generateShipmentNumber}
                  >
                    Generate Shipment #
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={generateTrackingNumber}
                  >
                    Generate Tracking #
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
                        isEditing ? 'Update Shipment' : 'Create Shipment'
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