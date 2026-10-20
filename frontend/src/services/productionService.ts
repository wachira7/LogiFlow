// src/services/productionService.ts 

import { api } from './api';
import type {
  ProductionOrder,
  ProductionOrderDetail,
  CreateProductionOrderData,
  UpdateProductionOrderData,
  ProductionStep,
  CreateProductionStepData,
  UpdateProductionStepData,
  ProductionMaterial,
  CreateProductionMaterialData,
  UpdateProductionMaterialData,
  ProductionDashboard,
  MaterialRequirementsReport,
  InsufficientStockReport,
  ProductionOrderFilters,
  ProductionStepFilters,
  ProductionMaterialFilters,
} from '@/types/production.types';

const BASE_URL = '/api/v1/production';

/** Return the payload, or throw the server's message so the UI can show it. */
function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) throw new Error(response.error || 'Something went wrong. Please try again.');
  return response.data as T;
}

// Type for paginated backend responses
interface BackendPaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

export const productionOrderService = {
  /**
   * Get all production orders with optional filters
   */
  getAll: async (filters?: ProductionOrderFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.created_by) params.append('created_by', filters.created_by);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    params.append('page_size', '100');

    const response = await api.get<BackendPaginatedResponse<ProductionOrder>>(
      `${BASE_URL}/orders/?${params.toString()}`
    );
    
    unwrap(response);
    // Handle pagination: extract results array or return empty array
    if (response.data) {
      return response.data.results || (Array.isArray(response.data) ? response.data : []);
    }
    return [];
  },

  /**
   * Get a single production order by ID
   */
  getById: async (id: string) => {
    const response = await api.get<ProductionOrderDetail>(`${BASE_URL}/orders/${id}/`);
    return unwrap(response);
  },

  /**
   * Create a new production order
   */
  create: async (data: CreateProductionOrderData) => {
    const response = await api.post<ProductionOrderDetail>(`${BASE_URL}/orders/`, data);
    return unwrap(response);
  },

  /**
   * Update an existing production order
   */
  update: async (id: string, data: UpdateProductionOrderData) => {
    const response = await api.patch<ProductionOrderDetail>(
      `${BASE_URL}/orders/${id}/`,
      data
    );
    return unwrap(response);
  },

  /**
   * Delete a production order
   */
  delete: async (id: string) => {
    unwrap(await api.delete(`${BASE_URL}/orders/${id}/`));
  },

  /**
   * Start a production order
   */
  startProduction: async (id: string) => {
    const response = await api.post<{ message: string; status: string; order: ProductionOrderDetail }>(
      `${BASE_URL}/orders/${id}/start_production/`
    );
    return unwrap(response);
  },

  /**
   * Complete a production order
   */
  completeProduction: async (id: string) => {
    const response = await api.post<{
      message: string;
      status: string;
      order: ProductionOrderDetail;
      inventory_updated: { product: string; warehouse: string; quantity_added: number; new_total: number };
    }>(`${BASE_URL}/orders/${id}/complete_production/`);
    return unwrap(response);
  },

  /**
   * Cancel a production order
   */
  cancelProduction: async (id: string) => {
    const response = await api.post<{
      message: string;
      status: string;
    }>(`${BASE_URL}/orders/${id}/cancel_production/`);
    return unwrap(response);
  },

  /**
   * Get production dashboard data
   */
  getDashboard: async () => {
    const response = await api.get<ProductionDashboard>(`${BASE_URL}/orders/dashboard/`);
    return unwrap(response);
  },

  /**
   * Get material requirements for active production orders
   */
  getMaterialRequirements: async () => {
    const response = await api.get<MaterialRequirementsReport>(
      `${BASE_URL}/orders/material_requirements/`
    );
    return unwrap(response);
  },
};

// ============================================================================
// PRODUCTION STEPS
// ============================================================================

export const productionStepService = {
  /**
   * Get all production steps with optional filters
   */
  getAll: async (filters?: ProductionStepFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.production_order) params.append('production_order', filters.production_order);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    params.append('page_size', '100');

    const response = await api.get<BackendPaginatedResponse<ProductionStep>>(
      `${BASE_URL}/steps/?${params.toString()}`
    );
    
    unwrap(response);
    // Handle pagination: extract results array or return empty array
    if (response.data) {
      return response.data.results || (Array.isArray(response.data) ? response.data : []);
    }
    return [];
  },

  /**
   * Get a single production step by ID
   */
  getById: async (id: string) => {
    const response = await api.get<ProductionStep>(`${BASE_URL}/steps/${id}/`);
    return unwrap(response);
  },

  /**
   * Create a new production step
   */
  create: async (data: CreateProductionStepData) => {
    const response = await api.post<ProductionStep>(`${BASE_URL}/steps/`, data);
    return unwrap(response);
  },

  /**
   * Update an existing production step
   */
  update: async (id: string, data: UpdateProductionStepData) => {
    const response = await api.patch<ProductionStep>(`${BASE_URL}/steps/${id}/`, data);
    return unwrap(response);
  },

  /**
   * Delete a production step
   */
  delete: async (id: string) => {
    unwrap(await api.delete(`${BASE_URL}/steps/${id}/`));
  },

  /**
   * Start a production step
   */
  startStep: async (id: string) => {
    const response = await api.post<{
      message: string;
      status: string;
      start_time: string;
    }>(`${BASE_URL}/steps/${id}/start_step/`);
    return unwrap(response);
  },

  /**
   * Complete a production step
   */
  completeStep: async (id: string) => {
    const response = await api.post<{
      message: string;
      status: string;
      end_time: string;
      next_step_started: string | null;
    }>(`${BASE_URL}/steps/${id}/complete_step/`);
    return unwrap(response);
  },

  /**
   * Skip a production step
   */
  skipStep: async (id: string) => {
    const response = await api.post<{
      message: string;
      status: string;
    }>(`${BASE_URL}/steps/${id}/skip_step/`);
    return unwrap(response);
  },
};

// ============================================================================
// PRODUCTION MATERIALS
// ============================================================================

export const productionMaterialService = {
  /**
   * Get all production materials with optional filters
   */
  getAll: async (filters?: ProductionMaterialFilters) => {
    const params = new URLSearchParams();
    if (filters?.production_order) params.append('production_order', filters.production_order);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    params.append('page_size', '100');

    const response = await api.get<BackendPaginatedResponse<ProductionMaterial>>(
      `${BASE_URL}/materials/?${params.toString()}`
    );
    
    unwrap(response);
    // Handle pagination: extract results array or return empty array
    if (response.data) {
      return response.data.results || (Array.isArray(response.data) ? response.data : []);
    }
    return [];
  },

  /**
   * Get a single production material by ID
   */
  getById: async (id: string) => {
    const response = await api.get<ProductionMaterial>(`${BASE_URL}/materials/${id}/`);
    return unwrap(response);
  },

  /**
   * Create a new production material
   */
  create: async (data: CreateProductionMaterialData) => {
    const response = await api.post<ProductionMaterial>(`${BASE_URL}/materials/`, data);
    return unwrap(response);
  },

  /**
   * Update an existing production material
   */
  update: async (id: string, data: UpdateProductionMaterialData) => {
    const response = await api.patch<ProductionMaterial>(
      `${BASE_URL}/materials/${id}/`,
      data
    );
    return unwrap(response);
  },

  /**
   * Delete a production material
   */
  delete: async (id: string) => {
    unwrap(await api.delete(`${BASE_URL}/materials/${id}/`));
  },

  /**
   * Get materials with insufficient stock
   */
  getInsufficientStock: async () => {
    const response = await api.get<InsufficientStockReport>(
      `${BASE_URL}/materials/insufficient_stock/`
    );
    return unwrap(response);
  },
};

const productionService = {
  orders: productionOrderService,
  steps: productionStepService,
  materials: productionMaterialService,
};

export default productionService;