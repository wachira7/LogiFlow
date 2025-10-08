// src/types/warehousing.types.ts

// ============================================================================
// WAREHOUSE TRANSFER TYPES
// ============================================================================

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface WarehouseTransfer {
  id: string;
  company_id: string;
  transfer_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  source_warehouse_name: string;
  destination_warehouse_name: string;
  status: TransferStatus;
  initiated_by_id: string;
  approved_by_id: string | null;
  initiated_by_name: string;
  approved_by_name: string | null;
  initiated_at: string;
  completed_at: string | null;
  transfer_duration_days: number | null;
  total_items: number;
  total_quantity: number;
  total_value: number;
  can_be_completed: boolean;
}

export interface WarehouseTransferDetail extends WarehouseTransfer {
  notes: string;
  transfer_items: TransferItem[];
  all_items_sufficient_stock: boolean;
}

export interface CreateWarehouseTransferData {
  transfer_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  notes?: string;
  transfer_items: CreateTransferItemData[];
}

export interface UpdateWarehouseTransferData {
  transfer_number?: string;
  source_warehouse_id?: string;
  destination_warehouse_id?: string;
  notes?: string;
}

// ============================================================================
// TRANSFER ITEM TYPES
// ============================================================================

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  source_location: string;
  destination_location: string;
  unit_cost: number;
  item_value: number;
  source_stock_available: number;
  sufficient_source_stock: boolean;
  destination_current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferItemData {
  product_id: string;
  quantity: number;
  source_location?: string;
  destination_location?: string;
}

export interface UpdateTransferItemData {
  product_id?: string;
  quantity?: number;
  source_location?: string;
  destination_location?: string;
}

// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

export interface WarehousingDashboard {
  total_transfers: number;
  pending_transfers: number;
  in_transit_transfers: number;
  completed_transfers: number;
  cancelled_transfers: number;
  monthly_transfers: number;
  monthly_completed: number;
  average_transfer_days: number;
  in_transit_value: number;
}

export interface StockMovement {
  source_warehouse: string;
  destination_warehouse: string;
  transfer_count: number;
  total_items: number;
  total_value: number;
}

export interface StockMovementsReport {
  stock_movements: StockMovement[];
  total_movement_pairs: number;
}

export interface InsufficientStockItem {
  transfer_number: string;
  product_name: string;
  product_sku: string;
  source_warehouse: string;
  required_quantity: number;
  available_stock: number;
  shortage: number;
  item_value: number;
}

export interface InsufficientStockReport {
  insufficient_stock_items: InsufficientStockItem[];
  total_items_with_shortage: number;
  total_shortage_value: number;
}

export interface PopularTransferProduct {
  product__name: string;
  product__sku: string;
  transfer_count: number;
  total_quantity: number;
}

export interface PopularTransfersReport {
  popular_transfer_products: PopularTransferProduct[];
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface WarehouseTransferFilters {
  status?: TransferStatus;
  source_warehouse?: string;
  destination_warehouse?: string;
  initiated_by?: string;
  search?: string;
  ordering?: string;
}

export interface TransferItemFilters {
  transfer?: string;
  product?: string;
  search?: string;
  ordering?: string;
}

// ============================================================================
// ACTION RESPONSE TYPES
// ============================================================================

export interface ApproveTransferResponse {
  message: string;
  status: TransferStatus;
  approved_by: string;
}

export interface StartTransferResponse {
  message: string;
  status: TransferStatus;
}

export interface CompleteTransferResponse {
  message: string;
  status: TransferStatus;
  completed_at: string;
  duration_days: number | null;
}

export interface CancelTransferResponse {
  message: string;
  status: TransferStatus;
}