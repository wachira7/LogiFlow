// src/services/distributionService.ts
import { api } from './api'
import type { DeliveryRoute, DeliveryRouteDetail, Order, OrderDetail, OrderInput, RouteStop, Shipment, ShipmentDetail } from '@/types/distribution.types'

const B = '/api/v1/distribution'

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}
const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []))
type Filters = Record<string, string | undefined>
const clean = (f: Filters = {}) => Object.fromEntries(Object.entries({ ...f, page_size: '100' }).filter(([, v]) => v))

export const distributionService = {
  orders: async (f?: Filters) => list<Order>(unwrap(await api.get(`${B}/orders/`, clean(f)))),
  order: async (id: string) => unwrap(await api.get<OrderDetail>(`${B}/orders/${id}/`)),
  createOrder: async (data: OrderInput) => unwrap(await api.post<OrderDetail>(`${B}/orders/`, data)),
  updateOrder: async (id: string, data: Partial<OrderInput>) => unwrap(await api.patch<OrderDetail>(`${B}/orders/${id}/`, data)),
  deleteOrder: async (id: string) => unwrap(await api.delete(`${B}/orders/${id}/`)),
  processOrder: async (id: string) => unwrap(await api.post(`${B}/orders/${id}/process_order/`)),
  createShipmentForOrder: async (id: string, warehouseId: string) =>
    unwrap(await api.post<{ shipment_id: string; shipment_number: string; message: string }>(`${B}/orders/${id}/ship_order/`, { warehouse_id: warehouseId })),
  cancelOrder: async (id: string) => unwrap(await api.post(`${B}/orders/${id}/cancel_order/`)),

  shipments: async (f?: Filters) => list<Shipment>(unwrap(await api.get(`${B}/shipments/`, clean(f)))),
  shipment: async (id: string) => unwrap(await api.get<ShipmentDetail>(`${B}/shipments/${id}/`)),
  createShipment: async (data: Partial<ShipmentDetail>) => unwrap(await api.post<ShipmentDetail>(`${B}/shipments/`, data)),
  updateShipment: async (id: string, data: Partial<ShipmentDetail>) => unwrap(await api.patch<ShipmentDetail>(`${B}/shipments/${id}/`, data)),
  deleteShipment: async (id: string) => unwrap(await api.delete(`${B}/shipments/${id}/`)),
  shipmentAction: async (id: string, action: 'pick' | 'pack' | 'ship' | 'deliver' | 'cancel' | 'return', data: Record<string, unknown> = {}) =>
    unwrap(await api.post<{ message: string; shipment: ShipmentDetail }>(`${B}/shipments/${id}/${action}_shipment/`, data)),
  track: async (trackingNumber: string) => unwrap(await api.get<ShipmentDetail>(`${B}/shipments/track/`, { tracking_number: trackingNumber })),

  routes: async (f?: Filters) => list<DeliveryRoute>(unwrap(await api.get(`${B}/routes/`, clean(f)))),
  route: async (id: string) => unwrap(await api.get<DeliveryRouteDetail>(`${B}/routes/${id}/`)),
  createRoute: async (data: Partial<DeliveryRouteDetail>) => unwrap(await api.post<DeliveryRouteDetail>(`${B}/routes/`, data)),
  updateRoute: async (id: string, data: Partial<DeliveryRouteDetail>) => unwrap(await api.patch<DeliveryRouteDetail>(`${B}/routes/${id}/`, data)),
  deleteRoute: async (id: string) => unwrap(await api.delete(`${B}/routes/${id}/`)),
  routeAction: async (id: string, action: 'start' | 'complete' | 'cancel') => unwrap(await api.post(`${B}/routes/${id}/${action}_route/`)),
  addStop: async (routeId: string, shipmentId: string, address: string) =>
    unwrap(await api.post<{ stop: RouteStop }>(`${B}/routes/${routeId}/add_stop/`, { shipment_id: shipmentId, address })),
  stopAction: async (id: string, action: 'arrive_at' | 'complete' | 'fail', data: Record<string, unknown> = {}) =>
    unwrap(await api.post(`${B}/route-stops/${id}/${action}_stop/`, data)),
  removeStop: async (id: string) => unwrap(await api.delete(`${B}/route-stops/${id}/`)),
}
