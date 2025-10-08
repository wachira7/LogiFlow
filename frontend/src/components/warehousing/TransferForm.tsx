// src/components/warehousing/TransferForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { useWarehouses, useProducts } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Package,
  AlertCircle
} from 'lucide-react'
import type { CreateWarehouseTransferData, CreateTransferItemData } from '@/types/warehousing.types'

interface TransferFormProps {
  transferId?: string
  isEdit?: boolean
}

interface TransferItemFormData extends CreateTransferItemData {
  id: string
  product_name?: string
  available_stock?: number
}

export function TransferForm({ transferId, isEdit = false }: TransferFormProps) {
  const router = useRouter()
  const { createTransfer, updateTransfer, fetchTransferById, currentTransfer, loading } = useWarehouseTransfers()
  const { warehouses = [], isLoading: warehousesLoading, refresh: refreshWarehouses } = useWarehouses()
  const { products = [], isLoading: productsLoading, refresh: refreshProducts } = useProducts()



  const [formData, setFormData] = useState<Omit<CreateWarehouseTransferData, 'transfer_items'>>({
    transfer_number: '',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    notes: '',
  })

  const [transferItems, setTransferItems] = useState<TransferItemFormData[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)


  useEffect(() => {
    refreshWarehouses()
    refreshProducts()
  }, [refreshWarehouses, refreshProducts])

  useEffect(() => {
    if (isEdit && transferId) {
      fetchTransferById(transferId)
    }
  }, [isEdit, transferId, fetchTransferById])

  useEffect(() => {
    if (isEdit && currentTransfer) {
      setFormData({
        transfer_number: currentTransfer.transfer_number,
        source_warehouse_id: currentTransfer.source_warehouse_id,
        destination_warehouse_id: currentTransfer.destination_warehouse_id,
        notes: currentTransfer.notes || '',
      })
      
      setTransferItems(
        currentTransfer.transfer_items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          source_location: item.source_location || '',
          destination_location: item.destination_location || '',
          product_name: item.product_name,
          available_stock: item.source_stock_available,
        }))
      )
    }
  }, [isEdit, currentTransfer])

   if (warehousesLoading || productsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
          <span className="ml-2 text-muted-foreground">Loading form data...</span>
        </div>
      )
    }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const addTransferItem = () => {
    const newItem: TransferItemFormData = {
      id: `temp-${Date.now()}`,
      product_id: '',
      quantity: 1,
      source_location: '',
      destination_location: '',
    }
    setTransferItems((prev) => [...prev, newItem])
  }

  const removeTransferItem = (id: string) => {
    setTransferItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateTransferItem = (id: string, field: keyof TransferItemFormData, value: string | number) => {
    setTransferItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          
          // Update product details when product changes
          if (field === 'product_id') {
            const product = products.find((p) => p.id === value)
            if (product) {
              updated.product_name = product.name
              // You could fetch available stock here if needed
            }
          }
          
          return updated
        }
        return item
      })
    )
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.transfer_number.trim()) {
      newErrors.transfer_number = 'Transfer number is required'
    }

    if (!formData.source_warehouse_id) {
      newErrors.source_warehouse_id = 'Source warehouse is required'
    }

    if (!formData.destination_warehouse_id) {
      newErrors.destination_warehouse_id = 'Destination warehouse is required'
    }

    if (formData.source_warehouse_id === formData.destination_warehouse_id) {
      newErrors.destination_warehouse_id = 'Source and destination warehouses must be different'
    }

    if (transferItems.length === 0) {
      newErrors.transfer_items = 'At least one transfer item is required'
    }

    transferItems.forEach((item, index) => {
      if (!item.product_id) {
        newErrors[`item_${index}_product`] = 'Product is required'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const transferData: CreateWarehouseTransferData = {
        ...formData,
        transfer_items: transferItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          source_location: item.source_location,
          destination_location: item.destination_location,
        })),
      }

      if (isEdit && transferId) {
        await updateTransfer(transferId, formData)
      } else {
        await createTransfer(transferData)
      }

      router.push('/warehousing/transfers')
    } catch (error) {
      console.error('Failed to save transfer:', error)
      setErrors({ submit: 'Failed to save transfer. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEdit ? 'Edit Transfer' : 'New Warehouse Transfer'}
            </h2>
            <p className="text-muted-foreground">
              {isEdit ? 'Update transfer details' : 'Create a new stock transfer between warehouses'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transfer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transfer Number */}
              <div className="space-y-2">
                <Label htmlFor="transfer_number">
                  Transfer Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="transfer_number"
                  value={formData.transfer_number}
                  onChange={(e) => handleInputChange('transfer_number', e.target.value)}
                  placeholder="e.g., TR-2024-001"
                  className={errors.transfer_number ? 'border-red-500' : ''}
                />
                {errors.transfer_number && (
                  <p className="text-sm text-red-500">{errors.transfer_number}</p>
                )}
              </div>

              {/* Source Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="source_warehouse">
                  Source Warehouse <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.source_warehouse_id}
                  onValueChange={(value) => handleInputChange('source_warehouse_id', value)}
                >
                  <SelectTrigger className={errors.source_warehouse_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.source_warehouse_id && (
                  <p className="text-sm text-red-500">{errors.source_warehouse_id}</p>
                )}
              </div>

              {/* Destination Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="destination_warehouse">
                  Destination Warehouse <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.destination_warehouse_id}
                  onValueChange={(value) => handleInputChange('destination_warehouse_id', value)}
                >
                  <SelectTrigger className={errors.destination_warehouse_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== formData.source_warehouse_id)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.destination_warehouse_id && (
                  <p className="text-sm text-red-500">{errors.destination_warehouse_id}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this transfer..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transfer Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addTransferItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.transfer_items && (
              <div className="flex items-center space-x-2 text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.transfer_items}</span>
              </div>
            )}

            {transferItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items added yet</p>
                <p className="text-sm">Click &quot;Add Item&quot; to start adding products to transfer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transferItems.map((item, index) => (
                  <Card key={item.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Product */}
                        <div className="md:col-span-2 space-y-2">
                          <Label>Product <span className="text-red-500">*</span></Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => updateTransferItem(item.id, 'product_id', value)}
                          >
                            <SelectTrigger className={errors[`item_${index}_product`] ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors[`item_${index}_product`] && (
                            <p className="text-sm text-red-500">{errors[`item_${index}_product`]}</p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label>Quantity <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateTransferItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className={errors[`item_${index}_quantity`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_quantity`] && (
                            <p className="text-sm text-red-500">{errors[`item_${index}_quantity`]}</p>
                          )}
                        </div>

                        {/* Source Location */}
                        <div className="space-y-2">
                          <Label>Source Location</Label>
                          <Input
                            value={item.source_location}
                            onChange={(e) => updateTransferItem(item.id, 'source_location', e.target.value)}
                            placeholder="e.g., A-1-2"
                          />
                        </div>

                        {/* Destination Location */}
                        <div className="space-y-2">
                          <Label>Destination Location</Label>
                          <Input
                            value={item.destination_location}
                            onChange={(e) => updateTransferItem(item.id, 'destination_location', e.target.value)}
                            placeholder="e.g., B-3-1"
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTransferItem(item.id)}
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

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LoadingSpinner className="mr-2" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{isEdit ? 'Update Transfer' : 'Create Transfer'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
