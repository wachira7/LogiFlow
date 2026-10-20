// src/types/distribution.types.ts
export type OrderStatus = 'NEW' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type ShipmentStatus = 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED'
export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type StopStatus = 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'FAILED'

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  total_price: string
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  status: OrderStatus
  total_amount: string
  subtotal: string
  item_count: number
  can_be_shipped: boolean
  shipment_count: number
  created_at: string
  updated_at: string
}

export interface OrderShipmentRef {
  id: string
  shipment_number: string
  status: ShipmentStatus
  tracking_number: string
  carrier: string
  warehouse_name: string
  shipping_date: string | null
  estimated_delivery: string | null
  actual_delivery: string | null
}

export interface OrderDetail extends Order {
  shipping_address: string
  billing_address: string
  tax_amount: string
  shipping_amount: string
  discount_amount: string
  notes: string
  order_items: OrderItem[]
  shipments: OrderShipmentRef[]
}

export interface OrderInput {
  order_number?: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  shipping_address: string
  billing_address?: string
  tax_amount?: string
  shipping_amount?: string
  discount_amount?: string
  notes?: string
  order_items: { product_id: string; quantity: number; unit_price?: string }[]
}

export interface Shipment {
  id: string
  shipment_number: string
  order_id: string | null
  order_number: string | null
  customer_name: string | null
  warehouse_id: string
  warehouse_name: string
  driver_id: string | null
  driver_name: string | null
  status: ShipmentStatus
  carrier: string
  tracking_number: string
  shipping_date: string | null
  estimated_delivery: string | null
  actual_delivery: string | null
  delivery_days: number | null
  is_delayed: boolean
  destination_address: string
  recipient_name: string
  item_count: number
  created_at: string
}

export interface ShipmentEvent {
  type: string
  message: string
  from_status: string
  to_status: string
  actor: string | null
  occurred_at: string
}

export interface ShipmentDetail extends Shipment {
  vehicle_info: string
  notes: string
  recipient_phone: string
  stock_deducted: boolean
  shipment_items: { id: string; product_id: string; product_name: string; product_sku: string; quantity: number }[]
  events: ShipmentEvent[]
  route_stop: { route_id: string; route_name: string; stop_number: number; status: StopStatus } | null
  vehicle_id: string | null
  vehicle_registration: string | null
  public_token: string
  open_exceptions: number
}

export interface RouteStop {
  id: string
  shipment_id: string
  shipment_number: string
  stop_number: number
  address: string
  estimated_arrival: string | null
  actual_arrival: string | null
  departure_time: string | null
  status: StopStatus
  notes: string
  stop_duration_minutes: number | null
  latitude: string | null
  longitude: string | null
  customer_name: string | null
}

export interface DeliveryRoute {
  id: string
  route_name: string
  driver_id: string | null
  driver_name: string | null
  vehicle_id: string
  fleet_vehicle_id: string | null
  fleet_vehicle_registration: string | null
  start_time: string | null
  end_time: string | null
  status: RouteStatus
  total_distance: string | null
  description: string
  start_location: string
  estimated_duration: string | null
  duration_hours: number | null
  stop_count: number
  created_at: string
}

export interface DeliveryRouteDetail extends DeliveryRoute {
  notes: string
  route_stops: RouteStop[]
}
