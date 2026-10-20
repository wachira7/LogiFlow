// src/services/stockService.ts
// Lean inventory API for the inventory pages: throws the server's message, types match the backend serializers.
import { api } from './api'

const B = '/api/v1/inventory'

export type Money = string | number

export interface StockCategory {
  id: string
  name: string
  description: string
  parent_id: string | null
  parent_name?: string | null
  full_path: string
  children_count: number
  products_count: number
  is_active: boolean
  created_at: string
}

export interface StockProduct {
  id: string
  name: string
  sku: string
  category_id: string | null
  category_name?: string | null
  unit_price: Money
  cost_price: Money
  profit_margin: number
  total_stock: number
  unit_of_measure: string
  needs_reorder: boolean
  reorder_point: number
  max_stock_level: number
  is_active: boolean
  image: string | null
  created_at: string
}

export interface StockProductDetail extends StockProduct {
  description: string
  category_full_path?: string | null
  barcode: string
  weight: Money | null
  dimensions: string
  min_stock_level: number
  lead_time_days: number
  stock_by_warehouse: { warehouse_id: string; warehouse_name: string; quantity: number; location: string; last_checked: string | null }[]
}

export type ProductInput = Partial<Pick<StockProductDetail,
  'name' | 'sku' | 'description' | 'category_id' | 'unit_of_measure' | 'barcode' | 'dimensions' | 'is_active'
  | 'min_stock_level' | 'max_stock_level' | 'reorder_point' | 'lead_time_days'>> & { unit_price?: string; cost_price?: string; weight?: string | null }

export interface StockWarehouse {
  id: string
  name: string
  code: string
  description: string
  capacity: number | null
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  manager_id: string | null
  manager_name?: string | null
  total_products: number
  total_stock_value: Money
  utilization_percentage: number | null
  is_active: boolean
  created_at: string
}

export interface StockLine {
  id: string
  product_id: string
  warehouse_id: string
  product_name: string
  product_sku: string
  warehouse_name: string
  warehouse_code: string
  unit_of_measure: string
  quantity: number
  location: string
  stock_value: Money
  product_unit_price: Money
  product_cost_price: Money
  reorder_point: number
  needs_reorder: boolean
  last_checked: string | null
  updated_at: string
}

export type MovementType = 'RECEIPT' | 'SHIPMENT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'PRODUCTION'

export interface Movement {
  id: string
  inventory_item_id: string
  transaction_type: MovementType
  quantity: number
  reference: string
  notes: string
  performed_by_name?: string | null
  product_name: string
  product_sku: string
  warehouse_name: string
  unit_of_measure: string
  balance_before: number | null
  balance_after: number | null
  timestamp: string
}

export interface StockReport {
  total_products: number
  active_products: number
  inactive_products: number
  low_stock_products: number
  out_of_stock_products: number
  total_stock_value: Money
  total_units: number
  by_warehouse: { id: string; name: string; lines: number; units: number; value: Money }[]
  by_category: { id: string | null; name: string; units: number; value: Money }[]
  reorder: { id: string; name: string; sku: string; unit_of_measure: string; stock: number; reorder_point: number; max_stock_level: number; suggested_order: number }[]
}

export interface Page<T> { results: T[]; count: number; next: string | null }

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}
type Filters = Record<string, string | number | boolean | undefined>
const clean = (f: Filters = {}) => Object.fromEntries(Object.entries({ page_size: 100, ...f } as Filters).filter(([, v]) => v !== undefined && v !== '' && v !== false).map(([k, v]) => [k, String(v)]))
const page = <T,>(d: unknown): Page<T> => (Array.isArray(d) ? { results: d, count: d.length, next: null } : { results: [], count: 0, next: null, ...(d as Partial<Page<T>>) })
const list = <T,>(d: unknown): T[] => page<T>(d).results

export const stockService = {
  report: async () => unwrap(await api.get<StockReport>(`${B}/products/stock_report/`)),

  products: async (f?: Filters) => page<StockProduct>(unwrap(await api.get(`${B}/products/`, clean(f)))),
  product: async (id: string) => unwrap(await api.get<StockProductDetail>(`${B}/products/${id}/`)),
  createProduct: async (data: ProductInput) => unwrap(await api.post<StockProductDetail>(`${B}/products/`, data)),
  updateProduct: async (id: string, data: ProductInput) => unwrap(await api.patch<StockProductDetail>(`${B}/products/${id}/`, data)),
  deleteProduct: async (id: string) => unwrap(await api.delete(`${B}/products/${id}/`)),

  categories: async (f?: Filters) => list<StockCategory>(unwrap(await api.get(`${B}/categories/`, clean(f)))),
  category: async (id: string) => unwrap(await api.get<StockCategory>(`${B}/categories/${id}/`)),
  createCategory: async (data: Partial<StockCategory>) => unwrap(await api.post<StockCategory>(`${B}/categories/`, data)),
  updateCategory: async (id: string, data: Partial<StockCategory>) => unwrap(await api.patch<StockCategory>(`${B}/categories/${id}/`, data)),
  deleteCategory: async (id: string) => unwrap(await api.delete(`${B}/categories/${id}/`)),

  warehouses: async (f?: Filters) => list<StockWarehouse>(unwrap(await api.get(`${B}/warehouses/`, clean(f)))),
  warehouse: async (id: string) => unwrap(await api.get<StockWarehouse>(`${B}/warehouses/${id}/`)),
  createWarehouse: async (data: Partial<StockWarehouse>) => unwrap(await api.post<StockWarehouse>(`${B}/warehouses/`, data)),
  updateWarehouse: async (id: string, data: Partial<StockWarehouse>) => unwrap(await api.patch<StockWarehouse>(`${B}/warehouses/${id}/`, data)),
  deleteWarehouse: async (id: string) => unwrap(await api.delete(`${B}/warehouses/${id}/`)),

  lines: async (f?: Filters) => page<StockLine>(unwrap(await api.get(`${B}/inventory-items/`, clean(f)))),
  line: async (id: string) => unwrap(await api.get<StockLine>(`${B}/inventory-items/${id}/`)),
  createLine: async (data: { product_id: string; warehouse_id: string; quantity: number; location?: string }) =>
    unwrap(await api.post<StockLine>(`${B}/inventory-items/`, data)),
  updateLine: async (id: string, data: { location: string }) => unwrap(await api.patch<StockLine>(`${B}/inventory-items/${id}/`, data)),
  deleteLine: async (id: string) => unwrap(await api.delete(`${B}/inventory-items/${id}/`)),
  adjust: async (data: { product_id: string; warehouse_id: string; adjustment_quantity: number; reason: string; notes?: string }) =>
    unwrap(await api.post<{ message: string; old_quantity: number; new_quantity: number }>(`${B}/inventory-items/adjust_stock/`, data)),

  receive: async (data: { product_id: string; warehouse_id: string; quantity: number; reference?: string; location?: string; notes?: string }) =>
    unwrap(await api.post<{ message: string; created: boolean; old_quantity: number; new_quantity: number; item: StockLine }>(`${B}/inventory-items/receive/`, data)),

  movements: async (f?: Filters) => page<Movement>(unwrap(await api.get(`${B}/transactions/`, clean(f)))),
}
