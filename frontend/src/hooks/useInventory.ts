// hooks/useInventory.ts - CORRECTED VERSION TO MATCH COMPONENTS

import { useState, useCallback, useEffect } from 'react'
import { InventoryService } from '@/services/inventoryService'
import { useToast } from '@/hooks/use-toast'
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
  BulkStockUpdate,
  ProductFilter,
  TransactionFilter,
  InventoryItemFilter,
  InventoryStats
} from '@/types/inventory.types'

// Dashboard Hook
export function useInventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsResponse, lowStockResponse] = await Promise.all([
        InventoryService.getDashboardStats(),
        InventoryService.getLowStockProducts()
      ])

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: statsResponse.error || "Failed to load dashboard stats"
        })
      }

      if (lowStockResponse.success && lowStockResponse.data) {
        setLowStockProducts(lowStockResponse.data)
      }
    } catch (error) {
      console.error('Dashboard data error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return {
    stats,
    lowStockProducts,
    isLoading,
    refresh: loadDashboardData
  }
}

// Products Hook - Enhanced with missing methods
export function useProducts(initialFilter?: ProductFilter) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<ProductFilter>(initialFilter || {})
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    count: 0,
    next: null as string | null,
    previous: null as string | null
  })
  const { toast } = useToast()

  const loadProducts = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await InventoryService.getProducts(filter, page, pagination.page_size)
      
      if (response.success && response.data) {
        setProducts(response.data)
        if (response.pagination) {
          setPagination(response.pagination)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load products"
        })
      }
    } catch (error) {
      console.error('Products loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products"
      })
    } finally {
      setIsLoading(false)
    }
  }, [filter, pagination.page_size, toast])

  const createProduct = useCallback(async (data: CreateProductData) => {
    try {
      const response = await InventoryService.createProduct(data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Product created successfully"
        })
        await loadProducts()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to create product"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Product creation error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const updateProduct = useCallback(async (id: string, data: UpdateProductData) => {
    try {
      const response = await InventoryService.updateProduct(id, data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Product updated successfully"
        })
        await loadProducts()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update product"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Product update error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const response = await InventoryService.deleteProduct(id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Product deleted successfully"
        })
        await loadProducts()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to delete product"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Product deletion error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const applyFilter = useCallback((newFilter: ProductFilter) => {
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    products,
    isLoading,
    pagination,
    filter,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    applyFilter,
    refresh: () => loadProducts(pagination.page)
  }
}

// Single Product Hook
export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadProduct = useCallback(async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      const response = await InventoryService.getProduct(id)
      
      if (response.success && response.data) {
        setProduct(response.data)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load product"
        })
      }
    } catch (error) {
      console.error('Product loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load product"
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  return {
    product,
    isLoading,
    refresh: loadProduct
  }
}

// Categories Hook - Fixed parent_id handling
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categoriesResponse, treeResponse] = await Promise.all([
        InventoryService.getCategories(),
        InventoryService.getCategoryTree().catch(() => ({ success: false, data: []  })) // Fallback if tree endpoint doesn't exist
      ])

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data)
      }

      if (treeResponse.success && treeResponse.data) {
        setCategoryTree(treeResponse.data)
      } else {
        // Build tree from flat categories if tree endpoint doesn't exist
        setCategoryTree(categoriesResponse.data || [])
      }

      if (!categoriesResponse.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: categoriesResponse.error || "Failed to load categories"
        })
      }
    } catch (error) {
      console.error('Categories loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const createCategory = useCallback(async (data: CreateCategoryData) => {
    try {
      // Handle null parent_id conversion
      const submitData = {
        ...data,
        parent_id: data.parent_id || undefined
      }
      
      const response = await InventoryService.createCategory(submitData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Category created successfully"
        })
        await loadCategories()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to create category"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Category creation error:', error)
      throw error
    }
  }, [loadCategories, toast])

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData) => {
    try {
      // Handle null parent_id conversion
      const submitData = {
        ...data,
        parent_id: data.parent_id || undefined
      }
      
      const response = await InventoryService.updateCategory(id, submitData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Category updated successfully"
        })
        await loadCategories()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update category"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Category update error:', error)
      throw error
    }
  }, [loadCategories, toast])

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const response = await InventoryService.deleteCategory(id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Category deleted successfully"
        })
        await loadCategories()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to delete category"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Category deletion error:', error)
      throw error
    }
  }, [loadCategories, toast])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return {
    categories,
    categoryTree,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: loadCategories
  }
}

// Warehouses Hook - Enhanced
export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await InventoryService.getWarehouses()
      
      if (response.success && response.data) {
        setWarehouses(response.data)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load warehouses"
        })
      }
    } catch (error) {
      console.error('Warehouses loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load warehouses"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const createWarehouse = useCallback(async (data: CreateWarehouseData) => {
    try {
      const response = await InventoryService.createWarehouse(data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Warehouse created successfully"
        })
        await loadWarehouses()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to create warehouse"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Warehouse creation error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  const updateWarehouse = useCallback(async (id: string, data: UpdateWarehouseData) => {
    try {
      const response = await InventoryService.updateWarehouse(id, data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Warehouse updated successfully"
        })
        await loadWarehouses()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update warehouse"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Warehouse update error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  const deleteWarehouse = useCallback(async (id: string) => {
    try {
      const response = await InventoryService.deleteWarehouse(id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Warehouse deleted successfully"
        })
        await loadWarehouses()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to delete warehouse"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Warehouse deletion error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  return {
    warehouses,
    isLoading,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    refresh: loadWarehouses
  }
}

// Single Warehouse Hook
export function useWarehouse(id: string) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadWarehouse = useCallback(async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      const [warehouseResponse, inventoryResponse] = await Promise.all([
        InventoryService.getWarehouse(id),
        InventoryService.getWarehouseInventory(id).catch(() => ({ success: false, data: [] }))
      ])

      if (warehouseResponse.success && warehouseResponse.data) {
        setWarehouse(warehouseResponse.data)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: warehouseResponse.error || "Failed to load warehouse"
        })
      }

      if (inventoryResponse.success && inventoryResponse.data) {
        setInventory(inventoryResponse.data)
      }
    } catch (error) {
      console.error('Warehouse loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load warehouse"
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadWarehouse()
  }, [loadWarehouse])

  return {
    warehouse,
    inventory,
    isLoading,
    refresh: loadWarehouse
  }
}

// Inventory Items Hook - Enhanced with missing methods
export function useInventoryItems(initialFilter?: InventoryItemFilter) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<InventoryItemFilter>(initialFilter || {})
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    count: 0,
    next: null as string | null,
    previous: null as string | null
  })
  const { toast } = useToast()

  const loadInventoryItems = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await InventoryService.getInventoryItems(filter, page, pagination.page_size)
      
      if (response.success && response.data) {
        setInventoryItems(response.data)
        if (response.pagination) {
          setPagination(response.pagination)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load inventory items"
        })
      }
    } catch (error) {
      console.error('Inventory items loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory items"
      })
    } finally {
      setIsLoading(false)
    }
  }, [filter, pagination.page_size, toast])

  const createInventoryItem = useCallback(async (data: CreateInventoryItemData) => {
    try {
      const response = await InventoryService.createInventoryItem(data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Inventory item created successfully"
        })
        await loadInventoryItems()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to create inventory item"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Inventory item creation error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const updateInventoryItem = useCallback(async (id: string, data: UpdateInventoryItemData) => {
    try {
      const response = await InventoryService.updateInventoryItem(id, data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Inventory item updated successfully"
        })
        await loadInventoryItems()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update inventory item"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Inventory item update error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const deleteInventoryItem = useCallback(async (id: string) => {
    try {
      const response = await InventoryService.deleteInventoryItem(id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Inventory item deleted successfully"
        })
        await loadInventoryItems()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to delete inventory item"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Inventory item deletion error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  // Add missing methods that components expect
  const adjustStock = useCallback(async (itemId: string, data: StockAdjustment) => {
    try {
      const adjustmentData = {
        ...data,
        inventory_item_id: itemId,
        item_id: itemId // For backward compatibility
      }
      
      const response = await InventoryService.adjustStock(adjustmentData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Stock adjusted successfully"
        })
        await loadInventoryItems()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to adjust stock"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Stock adjustment error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const bulkUpdateStock = useCallback(async (updates: BulkStockUpdate[]) => {
    try {
      // Convert BulkStockUpdate to StockAdjustment format
      const adjustments = updates.map(update => ({
        item_id: update.item_id,
        inventory_item_id: update.item_id,
        adjustment_type: 'set' as const,
        quantity: update.new_stock,
        reason: update.reason || 'Bulk update',
        notes: update.notes || ''
      }))

      const response = await InventoryService.bulkUpdateStock({ adjustments })
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Bulk stock update completed successfully"
        })
        await loadInventoryItems()
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update stock in bulk"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Bulk stock update error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const applyFilter = useCallback((newFilter: InventoryItemFilter) => {
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    loadInventoryItems()
  }, [loadInventoryItems])

  return {
    inventoryItems,
    isLoading,
    pagination,
    filter,
    loadInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,        // Add this method
    bulkUpdateStock,    // Add this method
    applyFilter,
    refresh: () => loadInventoryItems(pagination.page)
  }
}

// Transactions Hook - Enhanced
export function useTransactions(initialFilter?: TransactionFilter) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter || {})
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    count: 0,
    next: null as string | null,
    previous: null as string | null
  })
  const { toast } = useToast()

  const loadTransactions = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await InventoryService.getTransactions(filter, page, pagination.page_size)
      
      if (response.success && response.data) {
        setTransactions(response.data)
        if (response.pagination) {
          setPagination(response.pagination)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load transactions"
        })
      }
    } catch (error) {
      console.error('Transactions loading error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load transactions"
      })
    } finally {
      setIsLoading(false)
    }
  }, [filter, pagination.page_size, toast])

  const applyFilter = useCallback((newFilter: TransactionFilter) => {
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  return {
    transactions,
    isLoading,
    pagination,
    filter,
    loadTransactions,
    applyFilter,
    refresh: () => loadTransactions(pagination.page)
  }
}

// Legacy Stock Operations Hook - Keep for backward compatibility
export function useStock() {
  const { toast } = useToast()

  const adjustStock = useCallback(async (data: StockAdjustment) => {
    try {
      const response = await InventoryService.adjustStock(data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Stock adjusted successfully"
        })
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to adjust stock"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Stock adjustment error:', error)
      throw error
    }
  }, [toast])

  const bulkAdjustStock = useCallback(async (data: BulkStockAdjustment) => {
    try {
      const response = await InventoryService.bulkUpdateStock(data)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Bulk stock adjustment completed successfully"
        })
        return response.data
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to adjust stock in bulk"
        })
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Bulk stock adjustment error:', error)
      throw error
    }
  }, [toast])

  return {
    adjustStock,
    bulkAdjustStock
  }
}

// Export all hooks
export { useInventoryItems as useInventory } // For backward compatibility