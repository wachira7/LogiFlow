// src/hooks/useInventory.ts - COMPLETE UPDATED VERSION

import { useState, useCallback, useEffect } from 'react'
import { inventoryService } from '@/services/inventoryService'
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
    console.log('🔄 Loading dashboard data...')
    setIsLoading(true)
    
    try {
      const [statsResponse, lowStockResponse] = await Promise.all([
        inventoryService.getDashboardStats(),
        inventoryService.getLowStockProducts()
      ])

      console.log('✅ Dashboard stats response:', statsResponse)
      console.log('✅ Low stock response:', lowStockResponse)

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
      console.error('❌ Dashboard data error:', error)
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
    console.log('🎯 useInventoryDashboard effect triggered')
    loadDashboardData()
  }, [loadDashboardData])

  return {
    stats,
    lowStockProducts,
    isLoading,
    refresh: loadDashboardData
  }
}

// Products Hook
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
    console.log('🔄 Loading products...', { filter, page })
    setIsLoading(true)
    
    try {
      const response = await inventoryService.getProducts(filter, page, pagination.page_size)
      console.log('✅ Products response:', response)
      
      if (response.success && response.data) {
        setProducts(response.data)
        if (response.pagination) {
          setPagination(response.pagination)
        }
      } else {
        console.error('❌ Products error:', response.error)
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to load products"
        })
      }
    } catch (error) {
      console.error('❌ Products loading error:', error)
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
    console.log('➕ Creating product:', data)
    
    try {
      const response = await inventoryService.createProduct(data)
      
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
      console.error('❌ Product creation error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const updateProduct = useCallback(async (id: string, data: UpdateProductData) => {
    console.log('✏️ Updating product:', id, data)
    
    try {
      const response = await inventoryService.updateProduct(id, data)
      
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
      console.error('❌ Product update error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const deleteProduct = useCallback(async (id: string) => {
    console.log('🗑️ Deleting product:', id)
    
    try {
      const response = await inventoryService.deleteProduct(id)
      
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
      console.error('❌ Product deletion error:', error)
      throw error
    }
  }, [loadProducts, toast])

  const applyFilter = useCallback((newFilter: ProductFilter) => {
    console.log('🔧 Applying filter:', newFilter)
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    console.log('🎯 useProducts effect triggered')
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
    
    console.log('🔍 Loading product:', id)
    setIsLoading(true)
    
    try {
      const response = await inventoryService.getProduct(id)
      
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
      console.error('❌ Product loading error:', error)
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
    console.log('🎯 useProduct effect triggered for ID:', id)
    loadProduct()
  }, [loadProduct, id])

  return {
    product,
    isLoading,
    refresh: loadProduct
  }
}

// Categories Hook
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadCategories = useCallback(async () => {
    console.log('🔄 Loading categories...')
    setIsLoading(true)
    
    try {
      const [categoriesResponse, treeResponse] = await Promise.all([
        inventoryService.getCategories(),
        inventoryService.getCategoryTree().catch(() => ({ success: false, data: [] }))
      ])

      console.log('✅ Categories response:', categoriesResponse)
      console.log('✅ Category tree response:', treeResponse)

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data)
      }

      if (treeResponse.success && treeResponse.data) {
        setCategoryTree(treeResponse.data)
      } else {
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
      console.error('❌ Categories loading error:', error)
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
    console.log('➕ Creating category:', data)
    
    try {
      const submitData = {
        ...data,
        parent_id: data.parent_id || undefined
      }
      
      const response = await inventoryService.createCategory(submitData)
      
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
      console.error('❌ Category creation error:', error)
      throw error
    }
  }, [loadCategories, toast])

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData) => {
    console.log('✏️ Updating category:', id, data)
    
    try {
      const submitData = {
        ...data,
        parent_id: data.parent_id || undefined
      }
      
      const response = await inventoryService.updateCategory(id, submitData)
      
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
      console.error('❌ Category update error:', error)
      throw error
    }
  }, [loadCategories, toast])

  const deleteCategory = useCallback(async (id: string) => {
    console.log('🗑️ Deleting category:', id)
    
    try {
      const response = await inventoryService.deleteCategory(id)
      
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
      console.error('❌ Category deletion error:', error)
      throw error
    }
  }, [loadCategories, toast])

  useEffect(() => {
    console.log('🎯 useCategories effect triggered')
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

// Warehouses Hook
export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadWarehouses = useCallback(async () => {
    console.log('🔄 Loading warehouses...')
    setIsLoading(true)
    
    try {
      const response = await inventoryService.getWarehouses()
      console.log('✅ Warehouses response:', response)
      
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
      console.error('❌ Warehouses loading error:', error)
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
    console.log('➕ Creating warehouse:', data)
    
    try {
      const response = await inventoryService.createWarehouse(data)
      
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
      console.error('❌ Warehouse creation error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  const updateWarehouse = useCallback(async (id: string, data: UpdateWarehouseData) => {
    console.log('✏️ Updating warehouse:', id, data)
    
    try {
      const response = await inventoryService.updateWarehouse(id, data)
      
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
      console.error('❌ Warehouse update error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  const deleteWarehouse = useCallback(async (id: string) => {
    console.log('🗑️ Deleting warehouse:', id)
    
    try {
      const response = await inventoryService.deleteWarehouse(id)
      
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
      console.error('❌ Warehouse deletion error:', error)
      throw error
    }
  }, [loadWarehouses, toast])

  useEffect(() => {
    console.log('🎯 useWarehouses effect triggered')
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
    
    console.log('🔍 Loading warehouse:', id)
    setIsLoading(true)
    
    try {
      const [warehouseResponse, inventoryResponse] = await Promise.all([
        inventoryService.getWarehouse(id),
        inventoryService.getWarehouseInventory(id).catch(() => ({ success: false, data: [] }))
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
      console.error('❌ Warehouse loading error:', error)
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
    console.log('🎯 useWarehouse effect triggered for ID:', id)
    loadWarehouse()
  }, [loadWarehouse, id])

  return {
    warehouse,
    inventory,
    isLoading,
    refresh: loadWarehouse
  }
}

// Inventory Items Hook
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
    console.log('🔄 Loading inventory items...', { filter, page })
    setIsLoading(true)
    
    try {
      const response = await inventoryService.getInventoryItems(filter, page, pagination.page_size)
      console.log('✅ Inventory items response:', response)
      
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
      console.error('❌ Inventory items loading error:', error)
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
    console.log('➕ Creating inventory item:', data)
    
    try {
      const response = await inventoryService.createInventoryItem(data)
      
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
      console.error('❌ Inventory item creation error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const updateInventoryItem = useCallback(async (id: string, data: UpdateInventoryItemData) => {
    console.log('✏️ Updating inventory item:', id, data)
    
    try {
      const response = await inventoryService.updateInventoryItem(id, data)
      
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
      console.error('❌ Inventory item update error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const deleteInventoryItem = useCallback(async (id: string) => {
    console.log('🗑️ Deleting inventory item:', id)
    
    try {
      const response = await inventoryService.deleteInventoryItem(id)
      
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
      console.error('❌ Inventory item deletion error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const adjustStock = useCallback(async (itemId: string, data: StockAdjustment) => {
    console.log('📊 Adjusting stock:', itemId, data)
    
    try {
      const adjustmentData = {
        ...data,
        inventory_item_id: itemId,
        item_id: itemId
      }
      
      const response = await inventoryService.adjustStock(adjustmentData)
      
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
      console.error('❌ Stock adjustment error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const bulkUpdateStock = useCallback(async (updates: { item_id: string; new_stock: number; reason?: string; notes?: string }[]) => {
    console.log('📊 Bulk updating stock:', updates)
    
    try {
      const adjustments = updates.map(update => ({
        item_id: update.item_id,
        inventory_item_id: update.item_id,
        adjustment_type: 'set' as const,
        quantity: update.new_stock,
        reason: update.reason || 'Bulk update',
        notes: update.notes || ''
      }))

      const response = await inventoryService.bulkUpdateStock({ adjustments })
      
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
      console.error('❌ Bulk stock update error:', error)
      throw error
    }
  }, [loadInventoryItems, toast])

  const applyFilter = useCallback((newFilter: InventoryItemFilter) => {
    console.log('🔧 Applying filter:', newFilter)
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    console.log('🎯 useInventoryItems effect triggered')
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
    adjustStock,
    bulkUpdateStock,
    applyFilter,
    refresh: () => loadInventoryItems(pagination.page)
  }
}

// Transactions Hook
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
    console.log('🔄 Loading transactions...', { filter, page })
    setIsLoading(true)
    
    try {
      const response = await inventoryService.getTransactions(filter, page, pagination.page_size)
      console.log('✅ Transactions response:', response)
      
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
      console.error('❌ Transactions loading error:', error)
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
    console.log('🔧 Applying filter:', newFilter)
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  useEffect(() => {
    console.log('🎯 useTransactions effect triggered')
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

// Legacy Stock Operations Hook
export function useStock() {
  const { toast } = useToast()

  const adjustStock = useCallback(async (data: StockAdjustment) => {
    console.log('📊 Legacy stock adjustment:', data)
    
    try {
      const response = await inventoryService.adjustStock(data)
      
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
      console.error('❌ Stock adjustment error:', error)
      throw error
    }
  }, [toast])

  const bulkAdjustStock = useCallback(async (data: BulkStockAdjustment) => {
    console.log('📊 Legacy bulk stock adjustment:', data)
    
    try {
      const response = await inventoryService.bulkUpdateStock(data)
      
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
      console.error('❌ Bulk stock adjustment error:', error)
      throw error
    }
  }, [toast])

  return {
    adjustStock,
    bulkAdjustStock
  }
}

// Export main hook for backward compatibility
export { useInventoryItems as useInventory }