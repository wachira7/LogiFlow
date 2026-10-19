// types/inventory.types.ts 

export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  category_id: string
  category?: Category
  unit_of_measure?: string
  cost_price?: number
  unit_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  is_active: boolean
  created_at: string
  updated_at: string

  // Stock level fields — match backend serializer exactly
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  lead_time_days?: number

  // Computed fields from backend
  total_stock?: number
  needs_reorder?: boolean
  profit_margin?: number
  current_stock?: number   // keep for backward compat
  low_stock?: boolean      // keep for backward compat

  // From ProductDetailSerializer only
  stock_by_warehouse?: Array<{
    warehouse_id: string
    warehouse_name: string
    quantity: number
    location?: string
    last_checked?: string
  }>

  // REMOVEd these fields since they are not in the inventory model/serializer and not used in components. Can add back if needed for specific components, but better to keep types aligned with API for clarity.:
  // reorder_level, reorder_quantity, minimum_stock, maximum_stock
  // supplier_name, supplier_sku, track_stock, notes, total_value -- since they are not in inventory model/serializer
}

export interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string | null  
  parent?: Category
  children?: Category[]
  is_active: boolean
  created_at: string
  updated_at: string
  products_count?: number | undefined
  total_value?: number | undefined
}

export interface Warehouse {
  id: string
  name: string
  code: string
  description?: string
  address?: string
  city?: string             
  state?: string
  postal_code?: string
  country?: string
  phone?: string            
  email?: string            // Add for component compatibility
  manager_id?: string | null
  manager_name?: string
  manager_email?: string
  manager_phone?: string
  capacity?: number | undefined      // Add for component compatibility
  is_active: boolean
  created_at: string
  updated_at: string
  total_products?: number | undefined
  total_value?: number | undefined
  utilization_percentage?: number | null
}

export interface InventoryItem {
  id: string
  // Core fields for your API
  product_id: string
  warehouse_id?: string
  quantity: number
  product_name: string
  product_sku: string
  warehouse_name: string
  stock_value: number
  product_unit_price: number
  product_cost_price: number
  needs_reorder: boolean
  last_checked: string | null
  // Additional fields that components expect
  name: string              // Product name for display
  sku: string              // Product SKU for display
  description?: string      // Product description
  current_stock: number     // Current stock quantity
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  cost_price?: number
  unit_price?: number
  unit_of_measure?: string
  category_id?: string
  is_active: boolean
  track_stock?: boolean
  // Relations
  product?: Product
  warehouse?: Warehouse
  category?: Category
  // Other fields
  reserved_quantity?: number
  location?: string
  batch_number?: string
  expiration_date?: string
  created_at: string
  updated_at: string
  // Computed
  available_quantity?: number
  warehouse_code?: string
}

export interface Transaction {
  id: string
  // Core API fields
  transaction_type: TransactionType
  product_id: string
  warehouse_id?: string
  quantity: number
  previous_quantity?: number
  new_quantity?: number
  reason: string
  reference: string         
  notes?: string
  created_by?: string
  created_at: string
  timestamp: string 
  // Additional fields for component display
  type: string             // Transaction type for display
  item_name?: string       // Product name for display
  item_sku?: string        // Product SKU for display
  unit?: string            // Unit of measure
  warehouse_name?: string  // Warehouse name for display
  // Relations
  product?: Product
  warehouse?: Warehouse
  product_name?: string
  product_sku?: string
  unit_of_measure?: string
  performed_by_name?: string
  balance_before?: number | null
  balance_after?: number | null
}

export type TransactionType = 'RECEIPT' | 'SHIPMENT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'PRODUCTION'

// Create/Update data interfaces
export interface CreateProductData {
  name: string
  sku: string
  description?: string
  category_id: string
  unit_of_measure?: string
  cost_price?: number
  unit_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  lead_time_days?: number
  is_active?: boolean
  
}

export interface UpdateProductData {
  name?: string
  sku?: string
  description?: string
  category_id?: string
  unit_of_measure?: string
  cost_price?: number
  unit_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  lead_time_days?: number
  is_active?: boolean
}

export interface CreateCategoryData {
  name: string
  description?: string
  parent_id?: string | null  
  is_active?: boolean
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  parent_id?: string | null  // Allow null for components
  is_active?: boolean
}

export interface CreateWarehouseData {
  name: string
  code: string
  description?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  manager_name?: string
  manager_email?: string
  manager_phone?: string
  capacity?: number | null
  is_active?: boolean
  manager_id?: string | null
}

export interface UpdateWarehouseData {
  name?: string
  code?: string
  description?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  manager_name?: string
  manager_email?: string
  manager_phone?: string
  capacity?: number | null
  is_active?: boolean
}

export interface CreateInventoryItemData {
  /** Start stocking an existing product in a warehouse; a non-zero quantity is recorded as a receipt */
  product_id: string
  warehouse_id: string
  quantity?: number
  location?: string
}

export interface UpdateInventoryItemData {
  product_id?: string
  warehouse_id?: string
  quantity?: number
  name?: string
  sku?: string
  description?: string
  category_id?: string
  unit_of_measure?: string
  cost_price?: number
  unit_price?: number
  current_stock?: number
  minimum_stock?: number
  maximum_stock?: number
  reorder_point?: number
  supplier_name?: string
  supplier_sku?: string
  barcode?: string
  weight?: number
  dimensions?: string
  notes?: string
  is_active?: boolean
  track_stock?: boolean
  location?: string
  batch_number?: string
  expiration_date?: string
}

// Stock operations - Updated for components
export interface StockAdjustment {
  product_id: string
  warehouse_id: string
  adjustment_quantity: number
  reason: string
  notes?: string
}

export interface BulkStockAdjustment {
  updates: {
    product_id: string
    warehouse_id: string
    quantity: number
    notes?: string
  }[]
}

// New interface for bulk update from components
export interface BulkStockUpdate {
  item_id: string
  new_stock: number
  reason?: string
  notes?: string
  adjustment_type: 'add' | 'subtract' | 'set' | 'INCREASE' | 'DECREASE' | 'SET'
}

// Filters 
export interface ProductFilter {
  category?: string
  warehouse?: string
  is_active?: boolean
  low_stock?: boolean
  search?: string
  ordering?: string
}

export interface TransactionFilter {
  transaction_type?: TransactionType
  product?: string
  warehouse?: string
  date_from?: string
  date_to?: string
  search?: string
  ordering?: string
}

export interface InventoryItemFilter {
  product?: string
  warehouse?: string
  category?: string        // Add for component filters
  stock_status?: string    // Add for component filters
  unit_of_measure?: string // Add for component filters
  is_active?: string       // Add for component filters
  low_stock?: boolean
  search?: string
  ordering?: string
}

// Dashboard stats
export interface InventoryStats {
  total_products: number
  total_categories: number
  total_warehouses: number
  total_inventory_items: number
  low_stock_count: number
  out_of_stock_count: number
  recent_transactions_count: number
  total_inventory_value: number
}

// Reports
export interface StockReport {
  generated_at: string
  total_products: number
  total_inventory_value: number
  low_stock_items: Array<{
    product: Product
    inventory_item: InventoryItem
    shortage: number
  }>
  out_of_stock_items: Product[]
  category_breakdown: Array<{
    category: Category
    product_count: number
    total_value: number
  }>
  warehouse_breakdown: Array<{
    warehouse: Warehouse
    product_count: number
    total_value: number
  }>
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    page_size: number
    count: number
    next: string | null
    previous: string | null
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    page_size: number
    count: number
    next: string | null
    previous: string | null
  }
  error?: string
}

// Constants
export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'SHIPMENT', label: 'Shipment' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RETURN', label: 'Return' },
  { value: 'PRODUCTION', label: 'Production' },
]

export const ADJUSTMENT_TYPES = [
  { value: 'INCREASE', label: 'Increase' },
  { value: 'DECREASE', label: 'Decrease' },
  { value: 'SET', label: 'Set Quantity' },
  { value: 'add', label: 'Add to Stock' },
  { value: 'subtract', label: 'Remove from Stock' },
  { value: 'set', label: 'Set Exact Amount' }
]

export const STOCK_REASONS = [
  'Purchase Received',
  'Sale Completed',
  'Damaged Goods',
  'Expired Products',
  'Physical Count',
  'Customer Return',
  'Supplier Return',
  'Lost/Stolen',
  'Quality Rejection',
  'Manufacturing Use',
  'Sample/Demo',
  'recount',
  'damaged',
  'lost',
  'expired',
  'theft',
  'correction',
  'transfer',
  'other'
] as const

export type StockReason = typeof STOCK_REASONS[number]