// src/hooks/useDistribution.ts
import { useState, useCallback } from 'react';
import { distributionService } from '@/services/distributionService';
import { useToast } from '@/hooks/use-toast';
import type {
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
  OrderFilters,
  ShipmentFilters,
  RouteFilters,
  ShipOrderData,
  ShipShipmentData,
} from '@/types/distribution.types';

interface UseDistributionState {
  // Loading states
  loading: boolean;
  ordersLoading: boolean;
  shipmentsLoading: boolean;
  routesLoading: boolean;
  
  // Data states
  orders: CustomerOrderList[];
  selectedOrder: CustomerOrderDetail | null;
  shipments: ShipmentList[];
  selectedShipment: ShipmentDetail | null;
  routes: DeliveryRouteList[];
  selectedRoute: DeliveryRouteDetail | null;
  routeStops: RouteStop[];
  
  // Dashboard data
  orderDashboard: OrderDashboardData | null;
  shipmentReport: ShipmentTrackingReport | null;
  
  // Pagination
  ordersCount: number;
  shipmentsCount: number;
  routesCount: number;
  
  // Error state
  error: string | null;
}

export const useDistribution = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<UseDistributionState>({
    loading: false,
    ordersLoading: false,
    shipmentsLoading: false,
    routesLoading: false,
    orders: [],
    selectedOrder: null,
    shipments: [],
    selectedShipment: null,
    routes: [],
    selectedRoute: null,
    routeStops: [],
    orderDashboard: null,
    shipmentReport: null,
    ordersCount: 0,
    shipmentsCount: 0,
    routesCount: 0,
    error: null,
  });

  const updateState = useCallback((updates: Partial<UseDistributionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    console.error('Distribution error:', error);
    const errorMessage = customMessage || 
      (error instanceof Error ? error.message : 'An error occurred');
    updateState({ error: errorMessage, loading: false });
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }, [toast, updateState]);

  // ===== ORDER OPERATIONS =====

  const fetchOrders = useCallback(async (filters?: OrderFilters) => {
    updateState({ ordersLoading: true, error: null });
    try {
      const response = await distributionService.getOrders(filters);
      updateState({
        orders: response.results,
        ordersCount: response.count,
        ordersLoading: false,
      });
    } catch (error) {
      handleError(error, 'Failed to fetch orders');
      updateState({ ordersLoading: false });
    }
  }, [handleError, updateState]);

  const fetchOrder = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const order = await distributionService.getOrder(id);
      updateState({
        selectedOrder: order,
        loading: false,
      });
      return order;
    } catch (error) {
      handleError(error, 'Failed to fetch order details');
      return null;
    }
  }, [handleError, updateState]);

  const createOrder = useCallback(async (orderData: CreateCustomerOrderData) => {
    updateState({ loading: true, error: null });
    try {
      const newOrder = await distributionService.createOrder(orderData);
      updateState({
        orders: [newOrder, ...state.orders],
        selectedOrder: newOrder,
        ordersCount: state.ordersCount + 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Order created successfully',
      });
      return newOrder;
    } catch (error) {
      handleError(error, 'Failed to create order');
      return null;
    }
  }, [handleError, updateState, toast, state.orders, state.ordersCount]);

  const updateOrder = useCallback(async (id: string, orderData: Partial<CreateCustomerOrderData>) => {
    updateState({ loading: true, error: null });
    try {
      const updatedOrder = await distributionService.updateOrder(id, orderData);
      updateState({
        orders: state.orders.map(order => 
          order.id === id ? updatedOrder : order
        ),
        selectedOrder: state.selectedOrder?.id === id ? updatedOrder : state.selectedOrder,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });
      return updatedOrder;
    } catch (error) {
      handleError(error, 'Failed to update order');
      return null;
    }
  }, [handleError, updateState, toast, state.orders, state.selectedOrder]);

  const deleteOrder = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      await distributionService.deleteOrder(id);
      updateState({
        orders: state.orders.filter(order => order.id !== id),
        selectedOrder: state.selectedOrder?.id === id ? null : state.selectedOrder,
        ordersCount: state.ordersCount - 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });
    } catch (error) {
      handleError(error, 'Failed to delete order');
    }
  }, [handleError, updateState, toast, state.orders, state.selectedOrder, state.ordersCount]);

  const processOrder = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.processOrder(id);
      await fetchOrder(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to process order');
      return null;
    }
  }, [handleError, updateState, toast, fetchOrder]);

  const shipOrder = useCallback(async (id: string, shipData: ShipOrderData) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.shipOrder(id, shipData);
      await fetchOrder(id);
      toast({
        title: 'Success',
        description: `${response.message}${response.shipment_number ? `. Shipment: ${response.shipment_number}` : ''}`,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to ship order');
      return null;
    }
  }, [handleError, updateState, toast, fetchOrder]);

  const cancelOrder = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.cancelOrder(id);
      await fetchOrder(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to cancel order');
      return null;
    }
  }, [handleError, updateState, toast, fetchOrder]);

  const fetchOrderDashboard = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      const dashboard = await distributionService.getOrderDashboard();
      updateState({
        orderDashboard: dashboard,
        loading: false,
      });
      return dashboard;
    } catch (error) {
      handleError(error, 'Failed to fetch order dashboard');
      return null;
    }
  }, [handleError, updateState]);

  // Remove the useEffect that automatically fetches data on mount
  // Let components call fetchOrders explicitly when needed

  // ===== SHIPMENT OPERATIONS =====

  const fetchShipments = useCallback(async (filters?: ShipmentFilters) => {
    updateState({ shipmentsLoading: true, error: null });
    try {
      const response = await distributionService.getShipments(filters);
      updateState({
        shipments: response.results,
        shipmentsCount: response.count,
        shipmentsLoading: false,
      });
    } catch (error) {
      handleError(error, 'Failed to fetch shipments');
      updateState({ shipmentsLoading: false });
    }
  }, [handleError, updateState]);

  const fetchShipment = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const shipment = await distributionService.getShipment(id);
      updateState({
        selectedShipment: shipment,
        loading: false,
      });
      return shipment;
    } catch (error) {
      handleError(error, 'Failed to fetch shipment details');
      return null;
    }
  }, [handleError, updateState]);

  const createShipment = useCallback(async (shipmentData: CreateShipmentData) => {
    updateState({ loading: true, error: null });
    try {
      const newShipment = await distributionService.createShipment(shipmentData);
      updateState({
        shipments: [newShipment, ...state.shipments],
        selectedShipment: newShipment,
        shipmentsCount: state.shipmentsCount + 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Shipment created successfully',
      });
      return newShipment;
    } catch (error) {
      handleError(error, 'Failed to create shipment');
      return null;
    }
  }, [handleError, updateState, toast, state.shipments, state.shipmentsCount]);

  const updateShipment = useCallback(async (id: string, shipmentData: Partial<CreateShipmentData>) => {
    updateState({ loading: true, error: null });
    try {
      const updatedShipment = await distributionService.updateShipment(id, shipmentData);
      updateState({
        shipments: state.shipments.map(shipment => 
          shipment.id === id ? updatedShipment : shipment
        ),
        selectedShipment: state.selectedShipment?.id === id ? updatedShipment : state.selectedShipment,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Shipment updated successfully',
      });
      return updatedShipment;
    } catch (error) {
      handleError(error, 'Failed to update shipment');
      return null;
    }
  }, [handleError, updateState, toast, state.shipments, state.selectedShipment]);

  const deleteShipment = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      await distributionService.deleteShipment(id);
      updateState({
        shipments: state.shipments.filter(shipment => shipment.id !== id),
        selectedShipment: state.selectedShipment?.id === id ? null : state.selectedShipment,
        shipmentsCount: state.shipmentsCount - 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Shipment deleted successfully',
      });
    } catch (error) {
      handleError(error, 'Failed to delete shipment');
    }
  }, [handleError, updateState, toast, state.shipments, state.selectedShipment, state.shipmentsCount]);

  const pickShipment = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.pickShipment(id);
      await fetchShipment(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to pick shipment');
      return null;
    }
  }, [handleError, updateState, toast, fetchShipment]);

  const packShipment = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.packShipment(id);
      await fetchShipment(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to pack shipment');
      return null;
    }
  }, [handleError, updateState, toast, fetchShipment]);

  const shipShipment = useCallback(async (id: string, shipData?: ShipShipmentData) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.shipShipment(id, shipData);
      await fetchShipment(id);
      toast({
        title: 'Success',
        description: `${response.message}${response.tracking_number ? ` - Tracking: ${response.tracking_number}` : ''}`,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to ship shipment');
      return null;
    }
  }, [handleError, updateState, toast, fetchShipment]);

  const deliverShipment = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.deliverShipment(id);
      await fetchShipment(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to deliver shipment');
      return null;
    }
  }, [handleError, updateState, toast, fetchShipment]);

  const fetchShipmentTrackingReport = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      const report = await distributionService.getShipmentTrackingReport();
      updateState({
        shipmentReport: report,
        loading: false,
      });
      return report;
    } catch (error) {
      handleError(error, 'Failed to fetch shipment tracking report');
      return null;
    }
  }, [handleError, updateState]);

  // ===== ROUTE OPERATIONS =====

  const fetchRoutes = useCallback(async (filters?: RouteFilters) => {
    updateState({ routesLoading: true, error: null });
    try {
      const response = await distributionService.getRoutes(filters);
      updateState({
        routes: response.results,
        routesCount: response.count,
        routesLoading: false,
      });
    } catch (error) {
      handleError(error, 'Failed to fetch routes');
      updateState({ routesLoading: false });
    }
  }, [handleError, updateState]);

  const fetchRoute = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const route = await distributionService.getRoute(id);
      updateState({
        selectedRoute: route,
        loading: false,
      });
      return route;
    } catch (error) {
      handleError(error, 'Failed to fetch route details');
      return null;
    }
  }, [handleError, updateState]);

  const createRoute = useCallback(async (routeData: CreateDeliveryRouteData) => {
    updateState({ loading: true, error: null });
    try {
      const newRoute = await distributionService.createRoute(routeData);
      updateState({
        routes: [newRoute, ...state.routes],
        selectedRoute: newRoute,
        routesCount: state.routesCount + 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Route created successfully',
      });
      return newRoute;
    } catch (error) {
      handleError(error, 'Failed to create route');
      return null;
    }
  }, [handleError, updateState, toast, state.routes, state.routesCount]);

  const updateRoute = useCallback(async (id: string, routeData: Partial<CreateDeliveryRouteData>) => {
    updateState({ loading: true, error: null });
    try {
      const updatedRoute = await distributionService.updateRoute(id, routeData);
      updateState({
        routes: state.routes.map(route => 
          route.id === id ? updatedRoute : route
        ),
        selectedRoute: state.selectedRoute?.id === id ? updatedRoute : state.selectedRoute,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Route updated successfully',
      });
      return updatedRoute;
    } catch (error) {
      handleError(error, 'Failed to update route');
      return null;
    }
  }, [handleError, updateState, toast, state.routes, state.selectedRoute]);

  const deleteRoute = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      await distributionService.deleteRoute(id);
      updateState({
        routes: state.routes.filter(route => route.id !== id),
        selectedRoute: state.selectedRoute?.id === id ? null : state.selectedRoute,
        routesCount: state.routesCount - 1,
        loading: false,
      });
      toast({
        title: 'Success',
        description: 'Route deleted successfully',
      });
    } catch (error) {
      handleError(error, 'Failed to delete route');
    }
  }, [handleError, updateState, toast, state.routes, state.selectedRoute, state.routesCount]);

  const startRoute = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.startRoute(id);
      await fetchRoute(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to start route');
      return null;
    }
  }, [handleError, updateState, toast, fetchRoute]);

  const completeRoute = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.completeRoute(id);
      await fetchRoute(id);
      toast({
        title: 'Success',
        description: `${response.message}${response.duration_hours ? ` - Duration: ${response.duration_hours}h` : ''}`,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to complete route');
      return null;
    }
  }, [handleError, updateState, toast, fetchRoute]);

  const addRouteStop = useCallback(async (routeId: string, stopData: CreateRouteStopData) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.addRouteStop(routeId, stopData);
      await fetchRoute(routeId);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to add route stop');
      return null;
    }
  }, [handleError, updateState, toast, fetchRoute]);

  // ===== ROUTE STOP OPERATIONS =====

  const fetchRouteStops = useCallback(async (filters?: { status?: string; route?: string; search?: string; ordering?: string }) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.getRouteStops(filters);
      updateState({
        routeStops: response.results,
        loading: false,
      });
    } catch (error) {
      handleError(error, 'Failed to fetch route stops');
    }
  }, [handleError, updateState]);

  const arriveAtStop = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.arriveAtStop(id);
      toast({
        title: 'Success',
        description: response.message,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to arrive at stop');
      return null;
    }
  }, [handleError, updateState, toast]);

  const completeStop = useCallback(async (id: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.completeStop(id);
      toast({
        title: 'Success',
        description: `${response.message}${response.duration_minutes ? ` - Duration: ${response.duration_minutes}m` : ''}`,
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to complete stop');
      return null;
    }
  }, [handleError, updateState, toast]);

  const failStop = useCallback(async (id: string, notes?: string) => {
    updateState({ loading: true, error: null });
    try {
      const response = await distributionService.failStop(id, { notes });
      toast({
        title: 'Stop Failed',
        description: response.message,
        variant: 'destructive',
      });
      return response;
    } catch (error) {
      handleError(error, 'Failed to mark stop as failed');
      return null;
    }
  }, [handleError, updateState, toast]);

  return {
    // State
    ...state,
    
    // Order operations
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    processOrder,
    shipOrder,
    cancelOrder,
    fetchOrderDashboard,
    
    // Shipment operations
    fetchShipments,
    fetchShipment,
    createShipment,
    updateShipment,
    deleteShipment,
    pickShipment,
    packShipment,
    shipShipment,
    deliverShipment,
    fetchShipmentTrackingReport,
    
    // Route operations
    fetchRoutes,
    fetchRoute,
    createRoute,
    updateRoute,
    deleteRoute,
    startRoute,
    completeRoute,
    addRouteStop,
    
    // Route stop operations
    fetchRouteStops,
    arriveAtStop,
    completeStop,
    failStop,
    
    // Utility
    clearError: () => updateState({ error: null }),
    clearSelection: () => updateState({ 
      selectedOrder: null, 
      selectedShipment: null, 
      selectedRoute: null 
    }),
  };
};