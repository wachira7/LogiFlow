// src/components/distribution/OrderForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDistribution } from '@/hooks/useDistribution';
import { useInventoryItems } from '@/hooks/useInventory';
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
  Plus, 
  Trash2, 
  ArrowLeft,
  Calculator 
} from 'lucide-react';
import type { CreateCustomerOrderData, CustomerOrderDetail } from '@/types/distribution.types';
import type { InventoryItem } from '@/types/inventory.types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Price must be positive'),
});

const orderFormSchema = z.object({
  order_number: z.string().min(1, 'Order number is required'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Invalid email address'),
  customer_phone: z.string(),
  shipping_address: z.string().min(1, 'Shipping address is required'),
  billing_address: z.string(),
  tax_amount: z.number().min(0, 'Tax amount must be positive'),
  shipping_amount: z.number().min(0, 'Shipping amount must be positive'),
  discount_amount: z.number().min(0, 'Discount amount must be positive'),
  notes: z.string(),
  order_items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface OrderFormProps {
  orderId?: string;
  onSuccess?: (order: CustomerOrderDetail) => void;
  onCancel?: () => void;
}

// Helper type for inventory item with flexible structure
interface FlexibleInventoryItem {
  id: string;
  name?: string;
  price?: number;
  product?: {
    name?: string;
    price?: number;
  };
}

// Type assertion helper for form control - properly typed
//type TypedControl = Control<OrderFormData>;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderForm: React.FC<OrderFormProps> = ({ 
  orderId, 
  onSuccess, 
  onCancel 
}) => {
  const router = useRouter();
  const { 
    selectedOrder, 
    fetchOrder, 
    createOrder, 
    updateOrder, 
    loading 
  } = useDistribution();
  
  const { inventoryItems, loadInventoryItems } = useInventoryItems();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!orderId;

  // ============================================================================
  // FORM CONFIGURATION
  // ============================================================================

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_number: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      billing_address: '',
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      notes: '',
      order_items: [
        {
          product_id: '',
          quantity: 1,
          unit_price: 0,
        }
      ],
    },
  });

  // Type-safe control reference
  const control = form.control;

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: 'order_items',
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load data on mount
  useEffect(() => {
    loadInventoryItems();
    if (isEditing && orderId) {
      fetchOrder(orderId);
    }
  }, [isEditing, orderId, fetchOrder, loadInventoryItems]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedOrder && selectedOrder.id === orderId) {
      form.reset({
        order_number: selectedOrder.order_number,
        customer_name: selectedOrder.customer_name,
        customer_email: selectedOrder.customer_email,
        customer_phone: selectedOrder.customer_phone || '',
        shipping_address: selectedOrder.shipping_address,
        billing_address: selectedOrder.billing_address || '',
        tax_amount: selectedOrder.tax_amount ?? 0,
        shipping_amount: selectedOrder.shipping_amount ?? 0,
        discount_amount: selectedOrder.discount_amount ?? 0,
        notes: selectedOrder.notes || '',
        order_items: selectedOrder.order_items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
    }
  }, [isEditing, selectedOrder, orderId, form]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateTotals = useCallback(() => {
    const items = form.watch('order_items') || [];
    const taxAmount = Number(form.watch('tax_amount')) || 0;
    const shippingAmount = Number(form.watch('shipping_amount')) || 0;
    const discountAmount = Number(form.watch('discount_amount')) || 0;

    const subtotal = items.reduce((sum, item) => 
      sum + (Number(item.quantity) * Number(item.unit_price)), 0
    );

    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    return {
      subtotal,
      totalAmount: Math.max(0, totalAmount),
    };
  }, [form]);

  const { subtotal, totalAmount } = calculateTotals();

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getItemName = (item: FlexibleInventoryItem): string => {
    return item.product?.name || item.name || 'Unknown Product';
  };

  const getItemPrice = (item: FlexibleInventoryItem): number => {
    return item.product?.price || item.price || 0;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleProductChange = useCallback((index: number, productId: string) => {
    const item = inventoryItems.find((inv: InventoryItem) => inv.id === productId);
    if (item) {
      const flexibleItem = item as unknown as FlexibleInventoryItem;
      form.setValue(`order_items.${index}.product_id`, productId);
      form.setValue(`order_items.${index}.unit_price`, getItemPrice(flexibleItem));
    }
  }, [inventoryItems, form]);

  const handleAddItem = () => {
    append({ product_id: '', quantity: 1, unit_price: 0 });
  };

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    try {
      const orderData: CreateCustomerOrderData = {
        ...data,
        total_amount: totalAmount,
        order_items: data.order_items,
      };

      let result;
      if (isEditing && orderId) {
        result = await updateOrder(orderId, orderData);
      } else {
        result = await createOrder(orderData);
      }

      if (result) {
        onSuccess?.(result);
        if (!onSuccess) {
          router.push('/distribution/orders');
        }
      }
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/distribution/orders');
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
              {isEditing ? 'Edit Order' : 'Create New Order'}
            </h2>
            <p className="text-muted-foreground">
              {isEditing ? 'Update order details' : 'Fill in the order information'}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={control}
                    name="order_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number</FormLabel>
                        <FormControl>
                          <Input placeholder="ORD-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional order notes..." 
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

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="customer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john@example.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="shipping_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="123 Main St, City, State 12345" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="billing_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Address (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Same as shipping address" 
                              rows={3}
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

              {/* Order Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Order Items</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-5">
                        <FormField
                          control={control}
                          name={`order_items.${index}.product_id`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select
                                onValueChange={(value) => handleProductChange(index, value)}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {inventoryItems.map((item: InventoryItem) => {
                                    const flexibleItem = item as unknown as FlexibleInventoryItem;
                                    return (
                                      <SelectItem key={item.id} value={item.id}>
                                        {getItemName(flexibleItem)} - ${getItemPrice(flexibleItem).toFixed(2)}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={control}
                          name={`order_items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qty</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-3">
                        <FormField
                          control={control}
                          name={`order_items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormLabel className="sr-only">Remove</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={fields.length === 1}
                          className="mt-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="col-span-1 mt-8 text-right font-medium">
                        ${((Number(form.watch(`order_items.${index}.quantity`)) || 0) * 
                           (Number(form.watch(`order_items.${index}.unit_price`)) || 0)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Additional Charges */}
                  <Controller
                    name="tax_amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Tax Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />

                  <Controller
                    name="shipping_amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Shipping Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />

                  <Controller
                    name="discount_amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Discount Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Totals */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${(Number(form.watch('tax_amount')) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>${(Number(form.watch('shipping_amount')) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span>-${(Number(form.watch('discount_amount')) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
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
                        isEditing ? 'Update Order' : 'Create Order'
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