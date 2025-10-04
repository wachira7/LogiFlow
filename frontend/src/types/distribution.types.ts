// src/types/distribution.types.ts

// Base types for API responses
export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Order related types
export type OrderStatus = 'NEW' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerOrderList {
  id: string;
  company_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  item_count: number;
  can_be_shipped: boolean;
  created_at: string;
}

export interface CustomerOrderDetail extends CustomerOrderList {
  customer_phone: string;
  shipping_address: string;
  billing_address: string;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  notes: string;
  order_items: OrderItem[];
  updated_at: string;
}

export interface CreateCustomerOrderData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: string;
  billing_address?: string;
  total_amount: number;
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  notes?: string;
  order_items: Omit<OrderItem, 'id' | 'order_id' | 'product_name' | 'product_sku' | 'total_price' | 'created_at' | 'updated_at'>[];
}

// Shipment related types
export type ShipmentStatus = 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED';

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  order_item_id?: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ShipmentList {
  id: string;
  company_id: string;
  shipment_number: string;
  order_id?: string;
  order_number?: string;
  warehouse_id: string;
  warehouse_name: string;
  driver_id?: string;
  driver_name?: string;
  status: ShipmentStatus;
  carrier: string;
  tracking_number: string;
  shipping_date?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  delivery_days?: number;
  is_delayed: boolean;
  created_at: string;
}

export interface ShipmentDetail extends ShipmentList {
  vehicle_info: string;
  notes: string;
  shipment_items: ShipmentItem[];
  updated_at: string;
}

export interface CreateShipmentData {
  shipment_number: string;
  order_id?: string;
  warehouse_id: string;
  driver_id?: string;
  carrier?: string;
  tracking_number?: string;
  shipping_date?: string;
  estimated_delivery?: string;
  vehicle_info?: string;
  notes?: string;
}

// Route related types
export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RouteStopStatus = 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'FAILED';

export interface RouteStop {
  id: string;
  route_id: string;
  shipment_id: string;
  shipment_number: string;
  sequence_order: number;
  customer_name?: string;
  stop_number: number;
  address: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  departure_time?: string;
  status: RouteStopStatus;
  notes: string;
  stop_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRouteList {
  id: string;
  company_id: string;
  route_name: string;
  description?: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_id: string;
  start_time?: string;
  end_time?: string;
  status: RouteStatus;
  total_distance?: number;
  duration_hours?: number;
  stop_count: number;
  created_at: string;
}

export interface DeliveryRouteDetail extends DeliveryRouteList {
  vehicle_name: string;           
  estimated_duration?: number;    
  actual_duration?: number;       
  start_location?: string;        
  description?: string;           
  notes: string;
  route_stops: RouteStop[];
  updated_at: string;
}

export interface CreateDeliveryRouteData {
  route_name: string;
  description?: string;
  driver_id?: string;
  vehicle_id?: string;
  start_location?: string;           
  estimated_duration?: number;
  start_time?: string;
  end_time?: string;
  total_distance?: number;
  notes?: string;
}

export interface CreateRouteStopData {
  shipment_id: string;
  address: string;
  estimated_arrival?: string;
  notes?: string;
}

// Dashboard and Analytics types
export interface OrderDashboardData {
  total_orders: number;
  new_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  monthly_orders: number;
  monthly_revenue: number;
}

export interface ShipmentTrackingReport {
  total_shipments: number;
  pending_shipments: number;
  picked_shipments: number;
  packed_shipments: number;
  shipped_shipments: number;
  delivered_shipments: number;
  delayed_shipments: number;
  on_time_percentage: number;
  average_delivery_days: number;
}

// Action types for workflow operations
export interface OrderActionResponse {
  message: string;
  status?: OrderStatus;
}

export interface ShipmentActionResponse {
  message: string;
  status?: ShipmentStatus;
  tracking_number?: string;
  delivery_time?: string;
}

export interface RouteActionResponse {
  message: string;
  status?: RouteStatus;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  incomplete_stops?: string[];
}

export interface RouteStopActionResponse {
  message: string;
  status?: RouteStopStatus;
  arrival_time?: string;
  departure_time?: string;
  duration_minutes?: number;
  notes?: string;
}

// Form data types for UI components
export interface OrderFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  billing_address: string;
  notes: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface ShipmentFormData {
  shipment_number: string;
  order_id?: string;
  warehouse_id: string;
  driver_id?: string;
  carrier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  vehicle_info?: string;
  notes?: string;
}

export interface RouteFormData {
  route_name: string;
  driver_id?: string;
  vehicle_id: string;
  total_distance?: number;
  notes: string;
  stops: {
    shipment_id: string;
    address: string;
    estimated_arrival?: string;
    notes?: string;
  }[];
}

// Filter and search types
export interface OrderFilters {
  status?: OrderStatus;
  customer_email?: string;
  search?: string;
  ordering?: string;
}

export interface ShipmentFilters {
  status?: ShipmentStatus;
  warehouse?: string;
  driver?: string;
  carrier?: string;
  search?: string;
  ordering?: string;
}

export interface RouteFilters {
  status?: RouteStatus;
  driver?: string;
  search?: string;
  ordering?: string;
}

// Error types
export interface DistributionError {
  error: string;
  details?: string[];
  field_errors?: Record<string, string[]>;
}

// API endpoint responses
export interface ShipOrderData {
  warehouse_id: string;
}

export interface ShipShipmentData {
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
}

export interface FailStopData {
  notes?: string;
}