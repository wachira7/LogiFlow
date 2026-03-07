// src/components/production/ProductionOrderForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionOrders } from '@/hooks/useProduction'
import { useProducts, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, ArrowLeft, Package, ListChecks } from 'lucide-react'
import type { CreateProductionOrderData, CreateProductionStepData, CreateProductionMaterialData } from '@/types/production.types'

interface ProductionOrderFormProps {
  orderId?: string
  isEdit?: boolean
}

interface StepFormData extends CreateProductionStepData {
  id: string
}

interface MaterialFormData extends CreateProductionMaterialData {
  id: string
  product_name?: string
  warehouse_name?: string
}

export function ProductionOrderForm({ orderId, isEdit = false }: ProductionOrderFormProps) {
  const router = useRouter()
  const { createOrder, updateOrder, fetchOrderById, currentOrder, loading } = useProductionOrders()

  const { products = [], isLoading: productsLoading } = useProducts()
  const { warehouses = [], isLoading: warehousesLoading } = useWarehouses()

  const [formData, setFormData] = useState<Omit<CreateProductionOrderData, 'production_steps' | 'production_materials'>>({
    order_number: '',
    product_id: '',
    quantity: 1,
    status: 'PLANNED',
    notes: '',
    output_warehouse_id: '',
  })

  const [productionSteps, setProductionSteps] = useState<StepFormData[]>([])
  const [productionMaterials, setProductionMaterials] = useState<MaterialFormData[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isEdit && orderId) {
      fetchOrderById(orderId)
    }
  }, [isEdit, orderId, fetchOrderById])

  useEffect(() => {
    if (isEdit && currentOrder) {
      setFormData({
        order_number: currentOrder.order_number,
        product_id: currentOrder.product_id,
        quantity: currentOrder.quantity,
        status: currentOrder.status,
        start_date: currentOrder.start_date || undefined,
        end_date: currentOrder.end_date || undefined,
        notes: currentOrder.notes || '',
        output_warehouse_id: currentOrder.output_warehouse_id || '',
      })

      setProductionSteps(
        (currentOrder.production_steps || []).map((step) => ({
          id: step.id,
          name: step.name,
          description: step.description || '',
          duration_hours: step.duration_hours || undefined,
          status: step.status,
          assigned_to_id: step.assigned_to_id || undefined,
        }))
      )

      setProductionMaterials(
        (currentOrder.production_materials || []).map((material) => ({
          id: material.id,
          product_id: material.product_id,
          warehouse_id: material.warehouse_id,
          quantity: material.quantity,
          product_name: material.product_name,
          warehouse_name: material.warehouse_name,
        }))
      )
    }
  }, [isEdit, currentOrder])

  if (productsLoading || warehousesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Loading form data...</span>
      </div>
    )
  }

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const addProductionStep = () => {
    setProductionSteps((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, name: '', description: '', duration_hours: 0, status: 'PENDING' }
    ])
  }

  const removeProductionStep = (id: string) => {
    setProductionSteps((prev) => prev.filter((step) => step.id !== id))
  }

  const updateProductionStep = (id: string, field: keyof StepFormData, value: string | number) => {
    setProductionSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    )
  }

  const addProductionMaterial = () => {
    setProductionMaterials((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, product_id: '', warehouse_id: '', quantity: 1 }
    ])
  }

  const removeProductionMaterial = (id: string) => {
    setProductionMaterials((prev) => prev.filter((material) => material.id !== id))
  }

  const updateProductionMaterial = (id: string, field: keyof MaterialFormData, value: string | number) => {
    setProductionMaterials((prev) =>
      prev.map((material) => {
        if (material.id !== id) return material
        const updated = { ...material, [field]: value }
        if (field === 'product_id') {
          const product = products.find((p) => p.id === value)
          if (product) updated.product_name = product.name
        }
        if (field === 'warehouse_id') {
          const warehouse = warehouses.find((w) => w.id === value)
          if (warehouse) updated.warehouse_name = warehouse.name
        }
        return updated
      })
    )
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.order_number.trim()) newErrors.order_number = 'Order number is required'
    if (!formData.product_id) newErrors.product_id = 'Product is required'
    if (formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const orderData: CreateProductionOrderData = {
        ...formData,
        // Send undefined instead of empty string so the backend treats it as null
        output_warehouse_id: formData.output_warehouse_id || undefined,
        production_steps: productionSteps.map((step) => ({
          name: step.name,
          description: step.description,
          duration_hours: step.duration_hours,
          status: step.status,
          assigned_to_id: step.assigned_to_id,
        })),
        production_materials: productionMaterials.map((material) => ({
          product_id: material.product_id,
          warehouse_id: material.warehouse_id,
          quantity: material.quantity,
        })),
      }

      if (isEdit && orderId) {
        await updateOrder(orderId, {
          ...formData,
          output_warehouse_id: formData.output_warehouse_id || undefined,
        })
      } else {
        await createOrder(orderData)
      }

      router.push('/production/orders')
    } catch (error) {
      console.error('Failed to save production order:', error)
      setErrors({ submit: 'Failed to save production order. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEdit ? 'Edit Production Order' : 'New Production Order'}
            </h2>
            <p className="text-muted-foreground">
              {isEdit ? 'Update production order details' : 'Create a new production order'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Order Number */}
              <div className="space-y-2">
                <Label htmlFor="order_number">Order Number <span className="text-red-500">*</span></Label>
                <Input
                  id="order_number"
                  value={formData.order_number}
                  onChange={(e) => handleInputChange('order_number', e.target.value)}
                  placeholder="e.g., PO-2024-001"
                  className={errors.order_number ? 'border-red-500' : ''}
                />
                {errors.order_number && <p className="text-sm text-red-500">{errors.order_number}</p>}
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label>Product <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => handleInputChange('product_id', value)}
                >
                  <SelectTrigger className={errors.product_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select product to manufacture" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.product_id && <p className="text-sm text-red-500">{errors.product_id}</p>}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Output Warehouse */}
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Output Warehouse
                  <span className="ml-2 text-xs text-muted-foreground">
                    — finished goods will be stocked here when production completes
                  </span>
                </Label>
                <Select
                  value={formData.output_warehouse_id || ''}
                  onValueChange={(value) => handleInputChange('output_warehouse_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select output warehouse (required to complete production)" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date ? new Date(formData.start_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    handleInputChange('start_date', e.target.value ? new Date(e.target.value).toISOString() : '')
                  }
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    handleInputChange('end_date', e.target.value ? new Date(e.target.value).toISOString() : '')
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this production order..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps & Materials */}
        <Tabs defaultValue="steps" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="steps">
              <ListChecks className="h-4 w-4 mr-2" />
              Production Steps ({productionSteps.length})
            </TabsTrigger>
            <TabsTrigger value="materials">
              <Package className="h-4 w-4 mr-2" />
              Materials/BOM ({productionMaterials.length})
            </TabsTrigger>
          </TabsList>

          {/* Steps Tab */}
          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Production Steps</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addProductionStep}>
                    <Plus className="h-4 w-4 mr-2" />Add Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {productionSteps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No production steps added yet</p>
                    <p className="text-sm">Click &quot;Add Step&quot; to define the production process</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productionSteps.map((step) => (
                      <Card key={step.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 space-y-2">
                              <Label>Step Name *</Label>
                              <Input
                                value={step.name}
                                onChange={(e) => updateProductionStep(step.id, 'name', e.target.value)}
                                placeholder="e.g., Assembly"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={step.description}
                                onChange={(e) => updateProductionStep(step.id, 'description', e.target.value)}
                                placeholder="Step details..."
                              />
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <Label>Duration (hours)</Label>
                              <Input
                                type="number" min="0" step="0.5"
                                value={step.duration_hours || ''}
                                onChange={(e) => updateProductionStep(step.id, 'duration_hours', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button" variant="ghost" size="sm"
                                onClick={() => removeProductionStep(step.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bill of Materials (BOM)</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addProductionMaterial}>
                    <Plus className="h-4 w-4 mr-2" />Add Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {productionMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No materials added yet</p>
                    <p className="text-sm">Click &quot;Add Material&quot; to specify required materials</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productionMaterials.map((material) => (
                      <Card key={material.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
                            <div className="md:col-span-3 space-y-2">
                              <Label>Product *</Label>
                              <Select
                                value={material.product_id}
                                onValueChange={(value) => updateProductionMaterial(material.id, 'product_id', value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <Label>Warehouse *</Label>
                              <Select
                                value={material.warehouse_id}
                                onValueChange={(value) => updateProductionMaterial(material.id, 'warehouse_id', value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                                <SelectContent>
                                  {warehouses.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <Label>Quantity *</Label>
                              <Input
                                type="number" min="1"
                                value={material.quantity}
                                onChange={(e) => updateProductionMaterial(material.id, 'quantity', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button" variant="ghost" size="sm"
                                onClick={() => removeProductionMaterial(material.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <><LoadingSpinner className="mr-2" />{isEdit ? 'Updating...' : 'Creating...'}</>
            ) : (
              <>{isEdit ? 'Update Order' : 'Create Order'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}