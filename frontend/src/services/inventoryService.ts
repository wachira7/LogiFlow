// src/services/inventoryService.ts - COMPLETE UPDATED VERSION FOR NEW API CLIENT

import { api } from './api'
import type {
  Product,
  Category,
  Warehouse,
  InventoryItem,
  Transaction,
  CreateProductData,
  UpdateProductData,
  CreateCategoryData,
  UpdateCategoryData,
  CreateWarehouseData,
  UpdateWarehouseData,
  CreateInventoryItemData,
  UpdateInventoryItemData,
  StockAdjustment,
  BulkStockAdjustment,
  ProductFilter,
  TransactionFilter,
  InventoryItemFilter,
  InventoryStats,
  ApiResponse,
  PaginatedResponse
} from '@/types/inventory.types'

// Type for API response structure from backend
interface BackendResponse<T> {
  results?: T[]
  count?: number
  next?: string | null
  previous?: string | null
  // For single item responses
  [key: string]: unknown
}

export class InventoryService {
  // Products
  async getProducts(filter?: ProductFilter, page = 1, page_size = 20): Promise<PaginatedResponse<Product>> {
    try {
      const params: Record<string, unknown> = {
        page: page.toString(),
        page_size: page_size.toString()
      }

      if (filter) {
        if (filter.category) params.category = filter.category
        if (filter.warehouse) params.warehouse = filter.warehouse
        if (filter.is_active !== undefined) params.is_active = filter.is_active.toString()
        if (filter.low_stock) params.low_stock = 'true'
        if (filter.search) params.search = filter.search
        if (filter.ordering) params.ordering = filter.ordering
      }

      console.log('API call: GET /api/v1/inventory/products/', { params })
      const response = await api.get<BackendResponse<Product>>('/api/v1/inventory/products/', params)
      console.log('Products API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          data: [],
          pagination: { page: 1, page_size, count: 0, next: null, previous: null },
          error: response.error || 'Failed to fetch products'
        }
      }
      
      const data = response.data
      
      return {
        success: true,
        data: data.results || (Array.isArray(data) ? data as Product[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(data) ? data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      console.error('Products API error:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      }
    }
  }

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    try {
      console.log(`API call: GET /api/v1/inventory/products/${id}/`)
      const response = await api.get<Product>(`/api/v1/inventory/products/${id}/`)
      console.log('Product API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch product'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Product API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product'
      }
    }
  }

  async createProduct(data: CreateProductData): Promise<ApiResponse<Product>> {
    try {
      console.log('API call: POST /api/v1/inventory/products/', data)
      const response = await api.post<Product>('/api/v1/inventory/products/', data)
      console.log('Product creation response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to create product'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Product created successfully'
      }
    } catch (error) {
      console.error('Product creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product'
      }
    }
  }

  async updateProduct(id: string, data: UpdateProductData): Promise<ApiResponse<Product>> {
    try {
      console.log(`API call: PATCH /api/v1/inventory/products/${id}/`, data)
      const response = await api.patch<Product>(`/api/v1/inventory/products/${id}/`, data)
      console.log('Product update response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to update product'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Product updated successfully'
      }
    } catch (error) {
      console.error('Product update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product'
      }
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      console.log(`API call: DELETE /api/v1/inventory/products/${id}/`)
      const response = await api.delete(`/api/v1/inventory/products/${id}/`)
      console.log('Product deletion response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete product'
        }
      }
      
      return {
        success: true,
        message: 'Product deleted successfully'
      }
    } catch (error) {
      console.error('Product deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product'
      }
    }
  }

  async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    try {
      console.log('API call: GET /api/v1/inventory/products/low_stock/')
      const response = await api.get<Product[]>('/api/v1/inventory/products/low_stock/')
      console.log('Low stock products response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch low stock products'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Low stock products error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch low stock products'
      }
    }
  }

  async getStockReport(): Promise<ApiResponse<unknown>> {
    try {
      console.log('API call: GET /api/v1/inventory/products/stock_report/')
      const response = await api.get('/api/v1/inventory/products/stock_report/')
      console.log('Stock report response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch stock report'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Stock report error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stock report'
      }
    }
  }

  // Categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
  try {
    console.log('API call: GET /api/v1/inventory/categories/')
    const response = await api.get<BackendResponse<Category>>('/api/v1/inventory/categories/')
    console.log('Categories API response:', response)
    
    // FIX: Check for actual HTTP errors first
    if (!response.success) {
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch categories'
      }
    }
    
    // FIX: Handle the case where response.data might be undefined
    if (!response.data) {
      return {
        success: true,
        data: []  // Return empty array instead of failing
      }
    }
    
    const data = response.data
    const categories = data.results || (Array.isArray(data) ? data as Category[] : [])
    
    return {
      success: true,
      data: categories
    }
  } catch (error) {
    console.error('Categories API error:', error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch categories'
    }
  }
}

  async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    try {
      console.log('API call: GET /api/v1/inventory/categories/tree/')
      const response = await api.get<Category[]>('/api/v1/inventory/categories/tree/')
      console.log('Category tree API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch category tree'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Category tree API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category tree'
      }
    }
  }

  async getCategory(id: string): Promise<ApiResponse<Category>> {
    try {
      console.log(`API call: GET /api/v1/inventory/categories/${id}/`)
      const response = await api.get<Category>(`/api/v1/inventory/categories/${id}/`)
      console.log('Category API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch category'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Category API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category'
      }
    }
  }

  async createCategory(data: CreateCategoryData): Promise<ApiResponse<Category>> {
    try {
      console.log('API call: POST /api/v1/inventory/categories/', data)
      const response = await api.post<Category>('/api/v1/inventory/categories/', data)
      console.log('Category creation response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to create category'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Category created successfully'
      }
    } catch (error) {
      console.error('Category creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category'
      }
    }
  }

  async updateCategory(id: string, data: UpdateCategoryData): Promise<ApiResponse<Category>> {
    try {
      console.log(`API call: PATCH /api/v1/inventory/categories/${id}/`, data)
      const response = await api.patch<Category>(`/api/v1/inventory/categories/${id}/`, data)
      console.log('Category update response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to update category'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Category updated successfully'
      }
    } catch (error) {
      console.error('Category update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category'
      }
    }
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    try {
      console.log(`API call: DELETE /api/v1/inventory/categories/${id}/`)
      const response = await api.delete(`/api/v1/inventory/categories/${id}/`)
      console.log('Category deletion response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete category'
        }
      }
      
      return {
        success: true,
        message: 'Category deleted successfully'
      }
    } catch (error) {
      console.error('Category deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category'
      }
    }
  }

  // Warehouses
  async getWarehouses(): Promise<ApiResponse<Warehouse[]>> {
    try {
      console.log('API call: GET /api/v1/inventory/warehouses/')
      const response = await api.get<BackendResponse<Warehouse>>('/api/v1/inventory/warehouses/')
      console.log('Warehouses API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch warehouses'
        }
      }
      
      const data = response.data
      return {
        success: true,
        data: data.results || (Array.isArray(data) ? data as Warehouse[] : [])
      }
    } catch (error) {
      console.error('Warehouses API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch warehouses'
      }
    }
  }

  async getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
    try {
      console.log(`API call: GET /api/v1/inventory/warehouses/${id}/`)
      const response = await api.get<Warehouse>(`/api/v1/inventory/warehouses/${id}/`)
      console.log('Warehouse API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch warehouse'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Warehouse API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch warehouse'
      }
    }
  }

  async createWarehouse(data: CreateWarehouseData): Promise<ApiResponse<Warehouse>> {
    try {
      console.log('API call: POST /api/v1/inventory/warehouses/', data)
      const response = await api.post<Warehouse>('/api/v1/inventory/warehouses/', data)
      console.log('Warehouse creation response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to create warehouse'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Warehouse created successfully'
      }
    } catch (error) {
      console.error('Warehouse creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create warehouse'
      }
    }
  }

  async updateWarehouse(id: string, data: UpdateWarehouseData): Promise<ApiResponse<Warehouse>> {
    try {
      console.log(`API call: PATCH /api/v1/inventory/warehouses/${id}/`, data)
      const response = await api.patch<Warehouse>(`/api/v1/inventory/warehouses/${id}/`, data)
      console.log('Warehouse update response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to update warehouse'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Warehouse updated successfully'
      }
    } catch (error) {
      console.error('Warehouse update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update warehouse'
      }
    }
  }

  async deleteWarehouse(id: string): Promise<ApiResponse<void>> {
    try {
      console.log(`API call: DELETE /api/v1/inventory/warehouses/${id}/`)
      const response = await api.delete(`/api/v1/inventory/warehouses/${id}/`)
      console.log('Warehouse deletion response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete warehouse'
        }
      }
      
      return {
        success: true,
        message: 'Warehouse deleted successfully'
      }
    } catch (error) {
      console.error('Warehouse deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete warehouse'
      }
    }
  }

  async getWarehouseInventory(id: string): Promise<ApiResponse<InventoryItem[]>> {
    try {
      console.log(`API call: GET /api/v1/inventory/warehouses/${id}/inventory/`)
      const response = await api.get<InventoryItem[]>(`/api/v1/inventory/warehouses/${id}/inventory/`)
      console.log('Warehouse inventory response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch warehouse inventory'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Warehouse inventory error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch warehouse inventory'
      }
    }
  }

  async getWarehouseStockSummary(id: string): Promise<ApiResponse<unknown>> {
    try {
      console.log(`API call: GET /api/v1/inventory/warehouses/${id}/stock_summary/`)
      const response = await api.get(`/api/v1/inventory/warehouses/${id}/stock_summary/`)
      console.log('Warehouse stock summary response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch warehouse stock summary'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Warehouse stock summary error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch warehouse stock summary'
      }
    }
  }

  // Inventory Items
  async getInventoryItems(filter?: InventoryItemFilter, page = 1, page_size = 20): Promise<PaginatedResponse<InventoryItem>> {
    try {
      const params: Record<string, unknown> = {
        page: page.toString(),
        page_size: page_size.toString()
      }

      if (filter) {
        if (filter.product) params.product = filter.product
        if (filter.warehouse) params.warehouse = filter.warehouse
        if (filter.low_stock) params.low_stock = 'true'
        if (filter.search) params.search = filter.search
        if (filter.ordering) params.ordering = filter.ordering
      }

      console.log('API call: GET /api/v1/inventory/inventory-items/', { params })
      const response = await api.get<BackendResponse<InventoryItem>>('/api/v1/inventory/inventory-items/', params)
      console.log('Inventory items API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          data: [],
          pagination: { page: 1, page_size, count: 0, next: null, previous: null },
          error: response.error || 'Failed to fetch inventory items'
        }
      }
      
      const data = response.data
      
      return {
        success: true,
        data: data.results || (Array.isArray(data) ? data as InventoryItem[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(data) ? data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      console.error('Inventory items API error:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: error instanceof Error ? error.message : 'Failed to fetch inventory items'
      }
    }
  }

  async getInventoryItem(id: string): Promise<ApiResponse<InventoryItem>> {
    try {
      console.log(`API call: GET /api/v1/inventory/inventory-items/${id}/`)
      const response = await api.get<InventoryItem>(`/api/v1/inventory/inventory-items/${id}/`)
      console.log('Inventory item API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch inventory item'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Inventory item API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory item'
      }
    }
  }

  async createInventoryItem(data: CreateInventoryItemData): Promise<ApiResponse<InventoryItem>> {
    try {
      console.log('API call: POST /api/v1/inventory/inventory-items/', data)
      const response = await api.post<InventoryItem>('/api/v1/inventory/inventory-items/', data)
      console.log('Inventory item creation response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to create inventory item'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Inventory item created successfully'
      }
    } catch (error) {
      console.error('Inventory item creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create inventory item'
      }
    }
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemData): Promise<ApiResponse<InventoryItem>> {
    try {
      console.log(`API call: PATCH /api/v1/inventory/inventory-items/${id}/`, data)
      const response = await api.patch<InventoryItem>(`/api/v1/inventory/inventory-items/${id}/`, data)
      console.log('Inventory item update response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to update inventory item'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Inventory item updated successfully'
      }
    } catch (error) {
      console.error('Inventory item update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update inventory item'
      }
    }
  }

  async deleteInventoryItem(id: string): Promise<ApiResponse<void>> {
    try {
      console.log(`API call: DELETE /api/v1/inventory/inventory-items/${id}/`)
      const response = await api.delete(`/api/v1/inventory/inventory-items/${id}/`)
      console.log('Inventory item deletion response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete inventory item'
        }
      }
      
      return {
        success: true,
        message: 'Inventory item deleted successfully'
      }
    } catch (error) {
      console.error('Inventory item deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete inventory item'
      }
    }
  }

  async adjustStock(data: StockAdjustment): Promise<ApiResponse<unknown>> {
    try {
      console.log('API call: POST /api/v1/inventory/inventory-items/adjust_stock/', data)
      const response = await api.post('/api/v1/inventory/inventory-items/adjust_stock/', data)
      console.log('Stock adjustment response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to adjust stock'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Stock adjusted successfully'
      }
    } catch (error) {
      console.error('Stock adjustment error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust stock'
      }
    }
  }

  async bulkUpdateStock(data: BulkStockAdjustment): Promise<ApiResponse<unknown>> {
    try {
      console.log('API call: POST /api/v1/inventory/inventory-items/bulk_update/', data)
      const response = await api.post('/api/v1/inventory/inventory-items/bulk_update/', data)
      console.log('Bulk stock update response:', response)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update stock in bulk'
        }
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Bulk stock update completed successfully'
      }
    } catch (error) {
      console.error('Bulk stock update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock in bulk'
      }
    }
  }

  // Transactions
  async getTransactions(filter?: TransactionFilter, page = 1, page_size = 20): Promise<PaginatedResponse<Transaction>> {
    try {
      const params: Record<string, unknown> = {
        page: page.toString(),
        page_size: page_size.toString()
      }

      if (filter) {
        if (filter.transaction_type) params.transaction_type = filter.transaction_type
        if (filter.product) params.product = filter.product
        if (filter.warehouse) params.warehouse = filter.warehouse
        if (filter.date_from) params.date_from = filter.date_from
        if (filter.date_to) params.date_to = filter.date_to
        if (filter.search) params.search = filter.search
        if (filter.ordering) params.ordering = filter.ordering
      }

      console.log('API call: GET /api/v1/inventory/transactions/', { params })
      const response = await api.get<BackendResponse<Transaction>>('/api/v1/inventory/transactions/', params)
      console.log('Transactions API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          data: [],
          pagination: { page: 1, page_size, count: 0, next: null, previous: null },
          error: response.error || 'Failed to fetch transactions'
        }
      }
      
      const data = response.data
      
      return {
        success: true,
        data: data.results || (Array.isArray(data) ? data as Transaction[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(data) ? data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      console.error('Transactions API error:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: error instanceof Error ? error.message : 'Failed to fetch transactions'
      }
    }
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    try {
      console.log(`API call: GET /api/v1/inventory/transactions/${id}/`)
      const response = await api.get<Transaction>(`/api/v1/inventory/transactions/${id}/`)
      console.log('Transaction API response:', response)
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch transaction'
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Transaction API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction'
      }
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<ApiResponse<InventoryStats>> {
    try {
      console.log('API call: Dashboard stats (multiple endpoints)')
      
      const [productsRes, categoriesRes, warehousesRes, lowStockRes, transactionsRes] = await Promise.all([
        api.get<BackendResponse<Product>>('/api/v1/inventory/products/'),
        api.get<BackendResponse<Category>>('/api/v1/inventory/categories/'),
        api.get<BackendResponse<Warehouse>>('/api/v1/inventory/warehouses/'),
        api.get<Product[]>('/api/v1/inventory/products/low_stock/'),
        api.get<BackendResponse<Transaction>>('/api/v1/inventory/transactions/', { page_size: '10' })
      ])

      const productsData = productsRes.success ? productsRes.data : null
      const categoriesData = categoriesRes.success ? categoriesRes.data : null
      const warehousesData = warehousesRes.success ? warehousesRes.data : null
      const lowStockData = lowStockRes.success ? lowStockRes.data : []
      const transactionsData = transactionsRes.success ? transactionsRes.data : null

      const stats: InventoryStats = {
        total_products: productsData?.count || (Array.isArray(productsData) ? productsData.length : 0),
        total_categories: categoriesData?.count || (Array.isArray(categoriesData) ? categoriesData.length : 0),
        total_warehouses: warehousesData?.count || (Array.isArray(warehousesData) ? warehousesData.length : 0),
        total_inventory_items: 0,
        low_stock_count: Array.isArray(lowStockData) ? lowStockData.length : 0,
        out_of_stock_count: 0,
        recent_transactions_count: transactionsData?.count || 0,
        total_inventory_value: 0
      }

      console.log('Dashboard stats compiled:', stats)

      return {
        success: true,
        data: stats
      }
    } catch (err) {
      console.error('Dashboard stats error:', err)
      return {
        success: false,
        error: 'Failed to fetch dashboard stats'
      }
    }
  }

  // Helper methods for common operations
  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ search: query }, 1, 50)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }

  async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ category: categoryId }, 1, 100)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }

  async getProductsByWarehouse(warehouseId: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ warehouse: warehouseId }, 1, 100)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }
}

// Export instance instead of class
export const inventoryService = new InventoryService()