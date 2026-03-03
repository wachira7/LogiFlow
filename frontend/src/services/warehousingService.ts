// src/services/warehousingService.ts

import { api } from './api';
import type {
  WarehouseTransfer,
  WarehouseTransferDetail,
  CreateWarehouseTransferData,
  UpdateWarehouseTransferData,
  TransferItem,
  CreateTransferItemData,
  UpdateTransferItemData,
  WarehousingDashboard,
  StockMovementsReport,
  InsufficientStockReport,
  PopularTransfersReport,
  WarehouseTransferFilters,
  TransferItemFilters,
  ApproveTransferResponse,
  StartTransferResponse,
  CompleteTransferResponse,
  CancelTransferResponse,
} from '@/types/warehousing.types';

const BASE_URL = '/api/v1/warehousing';

// ============================================================================
// WAREHOUSE TRANSFERS
// ============================================================================

export const warehouseTransferService = {
  /**
   * Get all warehouse transfers with optional filters
   */
  getAll: async (filters?: WarehouseTransferFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source_warehouse) params.append('source_warehouse', filters.source_warehouse);
    if (filters?.destination_warehouse) params.append('destination_warehouse', filters.destination_warehouse);
    if (filters?.initiated_by) params.append('initiated_by', filters.initiated_by);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);

    const response = await api.get<WarehouseTransfer[]>(`${BASE_URL}/transfers/?${params.toString()}`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Get a single warehouse transfer by ID
   */
  getById: async (id: string) => {
    const response = await api.get<WarehouseTransferDetail>(`${BASE_URL}/transfers/${id}/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data
  },

  /**
   * Create a new warehouse transfer
   */
  create: async (data: CreateWarehouseTransferData) => {
    const response = await api.post<WarehouseTransferDetail>(`${BASE_URL}/transfers/`,data);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data
  },

  /**
   * Update an existing warehouse transfer
   */
  update: async (id: string, data: UpdateWarehouseTransferData) => {
    const response = await api.patch<WarehouseTransferDetail>(`${BASE_URL}/transfers/${id}/`, data);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Delete a warehouse transfer
   */
  delete: async (id: string) => {
    await api.delete(`${BASE_URL}/transfers/${id}/`);
  },

  /**
   * Approve a warehouse transfer
   */
  approveTransfer: async (id: string) => {
    const response = await api.post<ApproveTransferResponse>(`${BASE_URL}/transfers/${id}/approve_transfer/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Start a warehouse transfer (deducts stock from source)
   */
  startTransfer: async (id: string) => {
    const response = await api.post<StartTransferResponse>(`${BASE_URL}/transfers/${id}/start_transfer/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Complete a warehouse transfer (adds stock to destination)
   */
  completeTransfer: async (id: string) => {
    const response = await api.post<CompleteTransferResponse>(`${BASE_URL}/transfers/${id}/complete_transfer/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Cancel a warehouse transfer
   */
  cancelTransfer: async (id: string) => {
    const response = await api.post<CancelTransferResponse>(`${BASE_URL}/transfers/${id}/cancel_transfer/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Get warehousing dashboard data
   */
  getDashboard: async () => {
    const response = await api.get<WarehousingDashboard>(`${BASE_URL}/transfers/dashboard/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Get stock movements analysis between warehouses
   */
  getStockMovements: async () => {
    const response = await api.get<StockMovementsReport>(`${BASE_URL}/transfers/stock_movements/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },
};

// ============================================================================
// TRANSFER ITEMS
// ============================================================================

export const transferItemService = {
  /**
   * Get all transfer items with optional filters
   */
  getAll: async (filters?: TransferItemFilters) => {
    const params = new URLSearchParams();
    if (filters?.transfer) params.append('transfer', filters.transfer);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);

    const response = await api.get<TransferItem[]>(`${BASE_URL}/transfer-items/?${params.toString()}`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Get a single transfer item by ID
   */
  getById: async (id: string) => {
    const response = await api.get<TransferItem>(`${BASE_URL}/transfer-items/${id}/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Create a new transfer item
   */
  create: async (data: CreateTransferItemData) => {
    const response = await api.post<TransferItem>(`${BASE_URL}/transfer-items/`, data);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Update an existing transfer item
   */
  update: async (id: string, data: UpdateTransferItemData) => {
    const response = await api.patch<TransferItem>(`${BASE_URL}/transfer-items/${id}/`, data);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Delete a transfer item
   */
  delete: async (id: string) => {
    await api.delete(`${BASE_URL}/transfer-items/${id}/`);
  },

  /**
   * Get report of transfer items with insufficient stock
   */
  getInsufficientStockReport: async () => {
    const response = await api.get<InsufficientStockReport>(`${BASE_URL}/transfer-items/insufficient_stock_report/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },

  /**
   * Get most frequently transferred products
   */
  getPopularTransfers: async () => {
    const response = await api.get<PopularTransfersReport>(`${BASE_URL}/transfer-items/popular_transfers/`);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed')
    return response.data;
  },
};

const warehousingService = {
  transfers: warehouseTransferService,
  items: transferItemService,
};

export default warehousingService;
