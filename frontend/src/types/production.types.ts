// src/types/production.types.ts

// ============================================================================
// PRODUCTION ORDER TYPES
// ============================================================================

export type ProductionOrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrder {
  id: string;
  company_id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  status: ProductionOrderStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  created_by_id: string;
  created_by_name: string;
  duration_days: number | null;
  progress_percentage: number;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderDetail extends ProductionOrder {
  production_steps: ProductionStep[];
  production_materials: ProductionMaterial[];
  total_material_cost: number;
  materials_sufficient: boolean;
}

export interface CreateProductionOrderData {
  order_number: string;
  product_id: string;
  quantity: number;
  status?: ProductionOrderStatus;
  start_date?: string;
  end_date?: string;
  notes?: string;
  production_steps?: CreateProductionStepData[];
  production_materials?: CreateProductionMaterialData[];
}

export interface UpdateProductionOrderData {
  order_number?: string;
  product_id?: string;
  quantity?: number;
  status?: ProductionOrderStatus;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

// ============================================================================
// PRODUCTION STEP TYPES
// ============================================================================

export type ProductionStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ProductionStep {
  id: string;
  production_order_id: string;
  name: string;
  description: string;
  duration_hours: number | null;
  status: ProductionStepStatus;
  start_time: string | null;
  end_time: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  actual_duration_hours: number | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionStepData {
  name: string;
  description?: string;
  duration_hours?: number;
  status?: ProductionStepStatus;
  assigned_to_id?: string;
}

export interface UpdateProductionStepData {
  name?: string;
  description?: string;
  duration_hours?: number;
  status?: ProductionStepStatus;
  assigned_to_id?: string;
}

// ============================================================================
// PRODUCTION MATERIAL TYPES
// ============================================================================

export interface ProductionMaterial {
  id: string;
  production_order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  unit_cost: number;
  material_cost: number;
  available_stock: number;
  sufficient_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionMaterialData {
  product_id: string;
  warehouse_id: string;
  quantity: number;
}

export interface UpdateProductionMaterialData {
  product_id?: string;
  warehouse_id?: string;
  quantity?: number;
}

// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

export interface ProductionDashboard {
  total_orders: number;
  planned_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  overdue_orders: number;
  monthly_completed: number;
}

export interface MaterialRequirement {
  product_id: string;
  product_name: string;
  product_sku: string;
  required_quantity: number;
  available_stock: number;
  shortage: number;
}

export interface MaterialRequirementsReport {
  material_requirements: MaterialRequirement[];
  total_materials: number;
  materials_with_shortage: number;
}

export interface InsufficientMaterial {
  id: string;
  production_order: string;
  product_name: string;
  product_sku: string;
  warehouse: string;
  required_quantity: number;
  available_stock: number;
  shortage: number;
}

export interface InsufficientStockReport {
  materials_with_insufficient_stock: InsufficientMaterial[];
  total_count: number;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ProductionOrderFilters {
  status?: ProductionOrderStatus;
  product?: string;
  created_by?: string;
  search?: string;
  ordering?: string;
}

export interface ProductionStepFilters {
  status?: ProductionStepStatus;
  production_order?: string;
  assigned_to?: string;
  search?: string;
  ordering?: string;
}

export interface ProductionMaterialFilters {
  production_order?: string;
  product?: string;
  warehouse?: string;
  search?: string;
  ordering?: string;
}
