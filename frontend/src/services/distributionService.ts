// src/services/distributionService.ts
import { api } from './api';
import type {
  ApiResponse,
  CustomerOrderList,
  CustomerOrderDetail,
  CreateCustomerOrderData,
  ShipmentList,
  ShipmentDetail,
  CreateShipmentData,
  DeliveryRouteList,
  DeliveryRouteDetail,
  CreateDeliveryRouteData,
  RouteStop,
  CreateRouteStopData,
  OrderDashboardData,
  ShipmentTrackingReport,
  OrderActionResponse,
  ShipmentActionResponse,
  RouteActionResponse,
  RouteStopActionResponse,
  OrderFilters,
  ShipmentFilters,
  RouteFilters,
  ShipOrderData,
  ShipShipmentData,
  FailStopData
} from '@/types/distribution.types';

export class DistributionService {
  private baseUrl = '/api/v1/distribution';

  // ===== CUSTOMER ORDERS =====
  
  /**
   * Get list of customer orders with optional filtering
   */
  async getOrders(filters?: OrderFilters): Promise<ApiResponse<CustomerOrderList>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer_email) params.append('customer_email', filters.customer_email);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    
    const response = await api.get(`${this.baseUrl}/orders/?${params.toString()}`);
    if (!response.success) throw new Error(response.error);
    
    // Type assertion to match expected structure
    return response.data as ApiResponse<CustomerOrderList>;
  }

  /**
   * Get detailed information about a specific order
   */
  async getOrder(id: string): Promise<CustomerOrderDetail> {
    const response = await api.get<CustomerOrderDetail>(`${this.baseUrl}/orders/${id}/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Create a new customer order
   */
  async createOrder(orderData: CreateCustomerOrderData): Promise<CustomerOrderDetail> {
    const response = await api.post<CustomerOrderDetail>(`${this.baseUrl}/orders/`, orderData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Update an existing order
   */
  async updateOrder(id: string, orderData: Partial<CreateCustomerOrderData>): Promise<CustomerOrderDetail> {
    const response = await api.put<CustomerOrderDetail>(`${this.baseUrl}/orders/${id}/`, orderData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Partially update an order
   */
  async patchOrder(id: string, orderData: Partial<CreateCustomerOrderData>): Promise<CustomerOrderDetail> {
    const response = await api.patch<CustomerOrderDetail>(`${this.baseUrl}/orders/${id}/`, orderData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Delete an order
   */
  async deleteOrder(id: string): Promise<void> {
    const response = await api.delete(`${this.baseUrl}/orders/${id}/`);
    if (!response.success) throw new Error(response.error);
  }

  /**
   * Move order from NEW to PROCESSING status
   */
  async processOrder(id: string): Promise<OrderActionResponse> {
    const response = await api.post<OrderActionResponse>(`${this.baseUrl}/orders/${id}/process_order/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Create shipment for an order and move to SHIPPED status
   */
  async shipOrder(id: string, shipData: ShipOrderData): Promise<OrderActionResponse & { shipment_id?: string; shipment_number?: string }> {
    const response = await api.post<OrderActionResponse & { shipment_id?: string; shipment_number?: string }>(`${this.baseUrl}/orders/${id}/ship_order/`, shipData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Cancel a customer order
   */
  async cancelOrder(id: string): Promise<OrderActionResponse> {
    const response = await api.post<OrderActionResponse>(`${this.baseUrl}/orders/${id}/cancel_order/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Get order dashboard analytics
   */
  async getOrderDashboard(): Promise<OrderDashboardData> {
    const response = await api.get<OrderDashboardData>(`${this.baseUrl}/orders/dashboard/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  // ===== SHIPMENTS =====

  /**
   * Get list of shipments with optional filtering
   */
  async getShipments(filters?: ShipmentFilters): Promise<ApiResponse<ShipmentList>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.driver) params.append('driver', filters.driver);
    if (filters?.carrier) params.append('carrier', filters.carrier);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    
    const response = await api.get<ApiResponse<ShipmentList>>(`${this.baseUrl}/shipments/?${params.toString()}`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Get detailed information about a specific shipment
   */
  async getShipment(id: string): Promise<ShipmentDetail> {
    const response = await api.get<ShipmentDetail>(`${this.baseUrl}/shipments/${id}/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Create a new shipment
   */
  async createShipment(shipmentData: CreateShipmentData): Promise<ShipmentDetail> {
    const response = await api.post<ShipmentDetail>(`${this.baseUrl}/shipments/`, shipmentData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
  *tracking a shipment
  */

  async trackShipment(trackingNumber: string): Promise<ShipmentDetail | null> {
    try {
      const response = await api.get<ShipmentDetail>(
        `${this.baseUrl}/shipments/track/?tracking_number=${trackingNumber}`
      );
      if (!response.success) return null;
      return response.data!;
    } catch {
      return null;
    }
  }
  /**
   * Update an existing shipment
   */
  async updateShipment(id: string, shipmentData: Partial<CreateShipmentData>): Promise<ShipmentDetail> {
    const response = await api.put<ShipmentDetail>(`${this.baseUrl}/shipments/${id}/`, shipmentData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Partially update a shipment
   */
  async patchShipment(id: string, shipmentData: Partial<CreateShipmentData>): Promise<ShipmentDetail> {
    const response = await api.patch<ShipmentDetail>(`${this.baseUrl}/shipments/${id}/`, shipmentData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Delete a shipment
   */
  async deleteShipment(id: string): Promise<void> {
    const response = await api.delete(`${this.baseUrl}/shipments/${id}/`);
    if (!response.success) throw new Error(response.error);
  }

  /**
   * Mark shipment as picked (PENDING -> PICKED)
   */
  async pickShipment(id: string): Promise<ShipmentActionResponse> {
    const response = await api.post<ShipmentActionResponse>(`${this.baseUrl}/shipments/${id}/pick_shipment/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Mark shipment as packed (PICKED -> PACKED)
   */
  async packShipment(id: string): Promise<ShipmentActionResponse> {
    const response = await api.post<ShipmentActionResponse>(`${this.baseUrl}/shipments/${id}/pack_shipment/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Mark shipment as shipped (PACKED -> SHIPPED)
   */
  async shipShipment(id: string, shipData?: ShipShipmentData): Promise<ShipmentActionResponse> {
    const response = await api.post<ShipmentActionResponse>(`${this.baseUrl}/shipments/${id}/ship_shipment/`, shipData || {});
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Mark shipment as delivered (SHIPPED -> DELIVERED)
   */
  async deliverShipment(id: string): Promise<ShipmentActionResponse> {
    const response = await api.post<ShipmentActionResponse>(`${this.baseUrl}/shipments/${id}/deliver_shipment/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Get shipment tracking report and analytics
   */
  async getShipmentTrackingReport(): Promise<ShipmentTrackingReport> {
    const response = await api.get<ShipmentTrackingReport>(`${this.baseUrl}/shipments/tracking_report/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  // ===== DELIVERY ROUTES =====

  /**
   * Get list of delivery routes with optional filtering
   */
  async getRoutes(filters?: RouteFilters): Promise<ApiResponse<DeliveryRouteList>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.driver) params.append('driver', filters.driver);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    
    const response = await api.get<ApiResponse<DeliveryRouteList>>(`${this.baseUrl}/routes/?${params.toString()}`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Get detailed information about a specific route
   */
  async getRoute(id: string): Promise<DeliveryRouteDetail> {
    const response = await api.get<DeliveryRouteDetail>(`${this.baseUrl}/routes/${id}/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Create a new delivery route
   */
  async createRoute(routeData: CreateDeliveryRouteData): Promise<DeliveryRouteDetail> {
    const response = await api.post<DeliveryRouteDetail>(`${this.baseUrl}/routes/`, routeData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Update an existing route
   */
  async updateRoute(id: string, routeData: Partial<CreateDeliveryRouteData>): Promise<DeliveryRouteDetail> {
    const response = await api.put<DeliveryRouteDetail>(`${this.baseUrl}/routes/${id}/`, routeData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Partially update a route
   */
  async patchRoute(id: string, routeData: Partial<CreateDeliveryRouteData>): Promise<DeliveryRouteDetail> {
    const response = await api.patch<DeliveryRouteDetail>(`${this.baseUrl}/routes/${id}/`, routeData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Delete a route
   */
  async deleteRoute(id: string): Promise<void> {
    const response = await api.delete(`${this.baseUrl}/routes/${id}/`);
    if (!response.success) throw new Error(response.error);
  }

  /**
   * Start a delivery route (PLANNED -> IN_PROGRESS)
   */
  async startRoute(id: string): Promise<RouteActionResponse> {
    const response = await api.post<RouteActionResponse>(`${this.baseUrl}/routes/${id}/start_route/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Complete a delivery route (IN_PROGRESS -> COMPLETED)
   */
  async completeRoute(id: string): Promise<RouteActionResponse> {
    const response = await api.post<RouteActionResponse>(`${this.baseUrl}/routes/${id}/complete_route/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Add a stop to the delivery route
   */
  async addRouteStop(routeId: string, stopData: CreateRouteStopData): Promise<RouteActionResponse & { stop?: RouteStop }> {
    const response = await api.post<RouteActionResponse & { stop?: RouteStop }>(`${this.baseUrl}/routes/${routeId}/add_stop/`, stopData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  // ===== ROUTE STOPS =====

  /**
   * Get list of route stops
   */
  async getRouteStops(filters?: { status?: string; route?: string; search?: string; ordering?: string }): Promise<ApiResponse<RouteStop>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.route) params.append('route', filters.route);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    
    const response = await api.get<ApiResponse<RouteStop>>(`${this.baseUrl}/route-stops/?${params.toString()}`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Get detailed information about a specific route stop
   */
  async getRouteStop(id: string): Promise<RouteStop> {
    const response = await api.get<RouteStop>(`${this.baseUrl}/route-stops/${id}/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Update an existing route stop
   */
  async updateRouteStop(id: string, stopData: Partial<CreateRouteStopData>): Promise<RouteStop> {
    const response = await api.put<RouteStop>(`${this.baseUrl}/route-stops/${id}/`, stopData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Partially update a route stop
   */
  async patchRouteStop(id: string, stopData: Partial<CreateRouteStopData>): Promise<RouteStop> {
    const response = await api.patch<RouteStop>(`${this.baseUrl}/route-stops/${id}/`, stopData);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Delete a route stop
   */
  async deleteRouteStop(id: string): Promise<void> {
    const response = await api.delete(`${this.baseUrl}/route-stops/${id}/`);
    if (!response.success) throw new Error(response.error);
  }

  /**
   * Mark arrival at a route stop (PENDING -> ARRIVED)
   */
  async arriveAtStop(id: string): Promise<RouteStopActionResponse> {
    const response = await api.post<RouteStopActionResponse>(`${this.baseUrl}/route-stops/${id}/arrive_at_stop/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Complete a route stop (ARRIVED -> COMPLETED)
   */
  async completeStop(id: string): Promise<RouteStopActionResponse> {
    const response = await api.post<RouteStopActionResponse>(`${this.baseUrl}/route-stops/${id}/complete_stop/`);
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }

  /**
   * Mark a route stop as failed
   */
  async failStop(id: string, data?: FailStopData): Promise<RouteStopActionResponse> {
    const response = await api.post<RouteStopActionResponse>(`${this.baseUrl}/route-stops/${id}/fail_stop/`, data || {});
    if (!response.success) throw new Error(response.error);
    return response.data!;
  }
}

// Export singleton instance
export const distributionService = new DistributionService();