// types/inventory.types.ts - CORRECTED VERSION TO MATCH COMPONENTS

export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  category_id: string
  category?: Category
  unit_of_measure?: string
  cost_price?: number
  selling_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  supplier_name?: string
  supplier_sku?: string
  track_stock?: boolean
  minimum_stock?: number | undefined
  maximum_stock?: number | undefined
  reorder_level?: number | undefined  // Keep your existing field
  reorder_point?: number | undefined  // Add this for component compatibility
  reorder_quantity?: number | undefined // Keep your existing field
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed fields from backend
  current_stock?: number
  total_stock?: number
  total_value?: number
  low_stock?: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string | null  // Allow null for components
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
  city?: string             // Add for component compatibility
  state?: string
  postal_code?: string
  country?: string
  phone?: string            // Add for component compatibility
  email?: string            // Add for component compatibility
  manager_name?: string
  manager_email?: string
  manager_phone?: string
  capacity?: number | undefined      // Add for component compatibility
  is_active: boolean
  created_at: string
  updated_at: string
  total_products?: number | undefined
  total_value?: number | undefined
  utilization_percentage?: number | undefined
}

export interface InventoryItem {
  id: string
  // Core fields for your API
  product_id: string
  warehouse_id?: string
  quantity: number
  // Additional fields that components expect
  name: string              // Product name for display
  sku: string              // Product SKU for display
  description?: string      // Product description
  current_stock: number     // Current stock quantity
  minimum_stock?: number
  maximum_stock?: number
  reorder_point?: number
  cost_price?: number
  selling_price?: number
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
  reference: string         // Make required for components
  notes?: string
  created_by?: string
  created_at: string
  // Additional fields for component display
  type: string             // Transaction type for display
  item_name?: string       // Product name for display
  item_sku?: string        // Product SKU for display
  unit?: string            // Unit of measure
  warehouse_name?: string  // Warehouse name for display
  // Relations
  product?: Product
  warehouse?: Warehouse
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'

// Create/Update data interfaces
export interface CreateProductData {
  name: string
  sku: string
  description?: string
  category_id: string
  unit_of_measure?: string
  cost_price?: number
  selling_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  supplier_name?: string
  supplier_sku?: string
  track_stock?: boolean
  minimum_stock?: number
  maximum_stock?: number
  reorder_level: number
  reorder_point?: number
  reorder_quantity: number
  notes?: string
  is_active?: boolean
}

export interface UpdateProductData {
  name?: string
  sku?: string
  description?: string
  category_id?: string
  unit_of_measure?: string
  cost_price?: number
  selling_price?: number
  weight?: number
  dimensions?: string
  barcode?: string
  supplier_name?: string
  supplier_sku?: string
  track_stock?: boolean
  minimum_stock?: number
  maximum_stock?: number
  reorder_level?: number
  reorder_point?: number
  reorder_quantity?: number
  notes?: string
  is_active?: boolean
}

export interface CreateCategoryData {
  name: string
  description?: string
  parent_id?: string | null  // Allow null for components
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
  capacity?: number
  is_active?: boolean
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
  capacity?: number
  is_active?: boolean
}

export interface CreateInventoryItemData {
  // Core required fields
  product_id: string
  warehouse_id?: string
  quantity: number
  // Additional fields from components
  name: string
  sku: string
  description?: string
  category_id: string
  unit_of_measure?: string
  cost_price?: number
  selling_price?: number
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
  // Optional fields
  location?: string
  batch_number?: string
  expiration_date?: string
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
  selling_price?: number
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
  item_id?: string          // For compatibility
  inventory_item_id?: string // Your API field
  adjustment_type: 'add' | 'subtract' | 'set' | 'INCREASE' | 'DECREASE' | 'SET'
  quantity: number
  reason: string
  notes?: string
}

export interface BulkStockAdjustment {
  adjustments: StockAdjustment[]
}

// New interface for bulk update from components
export interface BulkStockUpdate {
  item_id: string
  new_stock: number
  reason?: string
  notes?: string
  adjustment_type: 'add' | 'subtract' | 'set' | 'INCREASE' | 'DECREASE' | 'SET'
}

// Filters - Keep your existing ones and add component compatibility
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
  { value: 'IN', label: 'Stock In' },
  { value: 'OUT', label: 'Stock Out' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER', label: 'Transfer' }
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