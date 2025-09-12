// services/inventoryService.ts 

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

interface ErrorResponse {
  detail?: string
  message?: string
  [key: string]: unknown
}

export class InventoryService {
  // Products - Using actual API endpoints
  static async getProducts(filter?: ProductFilter, page = 1, page_size = 20): Promise<PaginatedResponse<Product>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: page_size.toString()
      })

      if (filter) {
        if (filter.category) params.append('category', filter.category)
        if (filter.warehouse) params.append('warehouse', filter.warehouse)
        if (filter.is_active !== undefined) params.append('is_active', filter.is_active.toString())
        if (filter.low_stock) params.append('low_stock', 'true')
        if (filter.search) params.append('search', filter.search)
        if (filter.ordering) params.append('ordering', filter.ordering)
      }

      const response = await api.get(`/api/v1/inventory/products/?${params}`)
      const data = response.data as BackendResponse<Product>
      
      return {
        success: true,
        data: data.results || (Array.isArray(response.data) ? response.data as Product[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(response.data) ? response.data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: errorData?.detail || errorData?.message || 'Failed to fetch products'
      }
    }
  }

  static async getProduct(id: string): Promise<ApiResponse<Product>> {
    try {
      const response = await api.get(`/api/v1/inventory/products/${id}/`)
      return {
        success: true,
        data: response.data as Product
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch product'
      }
    }
  }

  static async createProduct(data: CreateProductData): Promise<ApiResponse<Product>> {
    try {
      const response = await api.post('/api/v1/inventory/products/', data)
      return {
        success: true,
        data: response.data as Product,
        message: 'Product created successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to create product'
      }
    }
  }

  static async updateProduct(id: string, data: UpdateProductData): Promise<ApiResponse<Product>> {
    try {
      const response = await api.patch(`/api/v1/inventory/products/${id}/`, data)
      return {
        success: true,
        data: response.data as Product,
        message: 'Product updated successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to update product'
      }
    }
  }

  static async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/v1/inventory/products/${id}/`)
      return {
        success: true,
        message: 'Product deleted successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to delete product'
      }
    }
  }

  static async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const response = await api.get('/api/v1/inventory/products/low_stock/')
      return {
        success: true,
        data: response.data as Product[]
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch low stock products'
      }
    }
  }

  static async getStockReport(): Promise<ApiResponse<unknown>> {
    try {
      const response = await api.get('/api/v1/inventory/products/stock_report/')
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch stock report'
      }
    }
  }

  // Categories - Using actual API endpoints
  static async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await api.get('/api/v1/inventory/categories/')
      const data = response.data as BackendResponse<Category>
      return {
        success: true,
        data: data.results || (Array.isArray(response.data) ? response.data as Category[] : [])
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch categories'
      }
    }
  }

  static async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await api.get('/api/v1/inventory/categories/tree/')
      return {
        success: true,
        data: response.data as Category[]
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch category tree'
      }
    }
  }

  static async getCategory(id: string): Promise<ApiResponse<Category>> {
    try {
      const response = await api.get(`/api/v1/inventory/categories/${id}/`)
      return {
        success: true,
        data: response.data as Category
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch category'
      }
    }
  }

  static async createCategory(data: CreateCategoryData): Promise<ApiResponse<Category>> {
    try {
      const response = await api.post('/api/v1/inventory/categories/', data)
      return {
        success: true,
        data: response.data as Category,
        message: 'Category created successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to create category'
      }
    }
  }

  static async updateCategory(id: string, data: UpdateCategoryData): Promise<ApiResponse<Category>> {
    try {
      const response = await api.patch(`/api/v1/inventory/categories/${id}/`, data)
      return {
        success: true,
        data: response.data as Category,
        message: 'Category updated successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to update category'
      }
    }
  }

  static async deleteCategory(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/v1/inventory/categories/${id}/`)
      return {
        success: true,
        message: 'Category deleted successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to delete category'
      }
    }
  }

  // Warehouses - Using actual API endpoints
  static async getWarehouses(): Promise<ApiResponse<Warehouse[]>> {
    try {
      const response = await api.get('/api/v1/inventory/warehouses/')
      const data = response.data as BackendResponse<Warehouse>
      return {
        success: true,
        data: data.results || (Array.isArray(response.data) ? response.data as Warehouse[] : [])
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch warehouses'
      }
    }
  }

  static async getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
    try {
      const response = await api.get(`/api/v1/inventory/warehouses/${id}/`)
      return {
        success: true,
        data: response.data as Warehouse
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch warehouse'
      }
    }
  }

  static async createWarehouse(data: CreateWarehouseData): Promise<ApiResponse<Warehouse>> {
    try {
      const response = await api.post('/api/v1/inventory/warehouses/', data)
      return {
        success: true,
        data: response.data as Warehouse,
        message: 'Warehouse created successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to create warehouse'
      }
    }
  }

  static async updateWarehouse(id: string, data: UpdateWarehouseData): Promise<ApiResponse<Warehouse>> {
    try {
      const response = await api.patch(`/api/v1/inventory/warehouses/${id}/`, data)
      return {
        success: true,
        data: response.data as Warehouse,
        message: 'Warehouse updated successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to update warehouse'
      }
    }
  }

  static async deleteWarehouse(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/v1/inventory/warehouses/${id}/`)
      return {
        success: true,
        message: 'Warehouse deleted successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to delete warehouse'
      }
    }
  }

  static async getWarehouseInventory(id: string): Promise<ApiResponse<InventoryItem[]>> {
    try {
      const response = await api.get(`/api/v1/inventory/warehouses/${id}/inventory/`)
      return {
        success: true,
        data: response.data as InventoryItem[]
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch warehouse inventory'
      }
    }
  }

  static async getWarehouseStockSummary(id: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await api.get(`/api/v1/inventory/warehouses/${id}/stock_summary/`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch warehouse stock summary'
      }
    }
  }

  // Inventory Items - Using actual API endpoints
  static async getInventoryItems(filter?: InventoryItemFilter, page = 1, page_size = 20): Promise<PaginatedResponse<InventoryItem>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: page_size.toString()
      })

      if (filter) {
        if (filter.product) params.append('product', filter.product)
        if (filter.warehouse) params.append('warehouse', filter.warehouse)
        if (filter.low_stock) params.append('low_stock', 'true')
        if (filter.search) params.append('search', filter.search)
        if (filter.ordering) params.append('ordering', filter.ordering)
      }

      const response = await api.get(`/api/v1/inventory/inventory-items/?${params}`)
      const data = response.data as BackendResponse<InventoryItem>
      
      return {
        success: true,
        data: data.results || (Array.isArray(response.data) ? response.data as InventoryItem[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(response.data) ? response.data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: errorData?.detail || 'Failed to fetch inventory items'
      }
    }
  }

  static async getInventoryItem(id: string): Promise<ApiResponse<InventoryItem>> {
    try {
      const response = await api.get(`/api/v1/inventory/inventory-items/${id}/`)
      return {
        success: true,
        data: response.data as InventoryItem
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch inventory item'
      }
    }
  }

  static async createInventoryItem(data: CreateInventoryItemData): Promise<ApiResponse<InventoryItem>> {
    try {
      const response = await api.post('/api/v1/inventory/inventory-items/', data)
      return {
        success: true,
        data: response.data as InventoryItem,
        message: 'Inventory item created successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to create inventory item'
      }
    }
  }

  static async updateInventoryItem(id: string, data: UpdateInventoryItemData): Promise<ApiResponse<InventoryItem>> {
    try {
      const response = await api.patch(`/api/v1/inventory/inventory-items/${id}/`, data)
      return {
        success: true,
        data: response.data as InventoryItem,
        message: 'Inventory item updated successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to update inventory item'
      }
    }
  }

  static async deleteInventoryItem(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/v1/inventory/inventory-items/${id}/`)
      return {
        success: true,
        message: 'Inventory item deleted successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to delete inventory item'
      }
    }
  }

  static async adjustStock(data: StockAdjustment): Promise<ApiResponse<unknown>> {
    try {
      const response = await api.post('/api/v1/inventory/inventory-items/adjust_stock/', data)
      return {
        success: true,
        data: response.data,
        message: 'Stock adjusted successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to adjust stock'
      }
    }
  }

  static async bulkUpdateStock(data: BulkStockAdjustment): Promise<ApiResponse<unknown>> {
    try {
      const response = await api.post('/api/v1/inventory/inventory-items/bulk_update/', data)
      return {
        success: true,
        data: response.data,
        message: 'Bulk stock update completed successfully'
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to update stock in bulk'
      }
    }
  }

  // Transactions - Using actual API endpoints
  static async getTransactions(filter?: TransactionFilter, page = 1, page_size = 20): Promise<PaginatedResponse<Transaction>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: page_size.toString()
      })

      if (filter) {
        if (filter.transaction_type) params.append('transaction_type', filter.transaction_type)
        if (filter.product) params.append('product', filter.product)
        if (filter.warehouse) params.append('warehouse', filter.warehouse)
        if (filter.date_from) params.append('date_from', filter.date_from)
        if (filter.date_to) params.append('date_to', filter.date_to)
        if (filter.search) params.append('search', filter.search)
        if (filter.ordering) params.append('ordering', filter.ordering)
      }

      const response = await api.get(`/api/v1/inventory/transactions/?${params}`)
      const data = response.data as BackendResponse<Transaction>
      
      return {
        success: true,
        data: data.results || (Array.isArray(response.data) ? response.data as Transaction[] : []),
        pagination: {
          page,
          page_size,
          count: data.count || (Array.isArray(response.data) ? response.data.length : 0),
          next: data.next || null,
          previous: data.previous || null
        }
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        data: [],
        pagination: { page: 1, page_size, count: 0, next: null, previous: null },
        error: errorData?.detail || 'Failed to fetch transactions'
      }
    }
  }

  static async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    try {
      const response = await api.get(`/api/v1/inventory/transactions/${id}/`)
      return {
        success: true,
        data: response.data as Transaction
      }
    } catch (error) {
      const errorData = (error as { response?: { data?: ErrorResponse } }).response?.data
      return {
        success: false,
        error: errorData?.detail || 'Failed to fetch transaction'
      }
    }
  }

  // Dashboard Stats - Built from existing endpoints
  static async getDashboardStats(): Promise<ApiResponse<InventoryStats>> {
    try {
      const [productsRes, categoriesRes, warehousesRes, lowStockRes, transactionsRes] = await Promise.all([
        api.get('/api/v1/inventory/products/'),
        api.get('/api/v1/inventory/categories/'),
        api.get('/api/v1/inventory/warehouses/'),
        api.get('/api/v1/inventory/products/low_stock/'),
        api.get('/api/v1/inventory/transactions/?page_size=10')
      ])

      const productsData = productsRes.data as BackendResponse<Product>
      const categoriesData = categoriesRes.data as BackendResponse<Category>
      const warehousesData = warehousesRes.data as BackendResponse<Warehouse>
      const lowStockData = lowStockRes.data as Product[]
      const transactionsData = transactionsRes.data as BackendResponse<Transaction>

      const stats: InventoryStats = {
        total_products: productsData.count || (Array.isArray(productsRes.data) ? productsRes.data.length : 0),
        total_categories: categoriesData.count || (Array.isArray(categoriesRes.data) ? categoriesRes.data.length : 0),
        total_warehouses: warehousesData.count || (Array.isArray(warehousesRes.data) ? warehousesRes.data.length : 0),
        total_inventory_items: 0, // Will be calculated from inventory-items endpoint
        low_stock_count: lowStockData.length || 0,
        out_of_stock_count: 0, // Calculate from low stock with quantity = 0
        recent_transactions_count: transactionsData.count || 0,
        total_inventory_value: 0 // Calculate from products with stock
      }

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
  static async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ search: query }, 1, 50)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }

  static async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ category: categoryId }, 1, 100)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }

  static async getProductsByWarehouse(warehouseId: string): Promise<ApiResponse<Product[]>> {
    const response = await this.getProducts({ warehouse: warehouseId }, 1, 100)
    return {
      success: response.success,
      data: response.data,
      error: response.error
    }
  }
}