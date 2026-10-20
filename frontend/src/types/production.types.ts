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
  unit_of_measure?: string;
  quantity: number;
  status: ProductionOrderStatus;
  /** Planned start; set to the actual start when production starts */
  start_date: string | null;
  /** Target end; set to the actual end when production completes */
  end_date: string | null;
  notes: string;
  output_warehouse_id: string | null;
  output_warehouse_name: string | null;
  /** Raw materials have been taken out of stock (happens on start) */
  materials_consumed: boolean;
  created_by_id: string | null;
  created_by_name: string | null;
  duration_days: number | null;
  progress_percentage: number;
  estimated_completion: string | null;
  steps_total: number;
  steps_done: number;
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
  /** Left blank → numbered automatically (PO-YYYYMMDD-NNN) */
  order_number?: string;
  product_id: string;
  quantity: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
  output_warehouse_id?: string | null;
  production_steps?: CreateProductionStepData[];
  production_materials?: CreateProductionMaterialData[];
}

export interface UpdateProductionOrderData {
  order_number?: string;
  product_id?: string;
  quantity?: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
  output_warehouse_id?: string | null;
}

// ============================================================================
// PRODUCTION STEP TYPES
// ============================================================================

export type ProductionStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ProductionStep {
  id: string;
  production_order_id: string;
  order_number?: string;
  order_status?: ProductionOrderStatus;
  product_name?: string;
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
  /** Required when adding a step to an existing order; omitted when nested in a new order */
  production_order_id?: string;
  name: string;
  description?: string;
  duration_hours?: number | string | null;
  assigned_to_id?: string | null;
}

export interface UpdateProductionStepData {
  name?: string;
  description?: string;
  duration_hours?: number | string | null;
  assigned_to_id?: string | null;
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
  unit_of_measure?: string;
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
  /** Required when adding to an existing order; omitted when nested in a new order */
  production_order_id?: string;
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
  monthly_units: number;
  average_cycle_hours: number;
  steps_in_progress: number;
}

export interface MaterialRequirement {
  product_id: string;
  product_name: string;
  product_sku: string;
  warehouse_id: string;
  warehouse_name: string;
  order_count: number;
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
  production_order_id: string;
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