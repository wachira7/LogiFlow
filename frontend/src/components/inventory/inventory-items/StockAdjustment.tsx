// src/components/inventory/inventory-items/StockAdjustment.tsx
'use client'

import { useState } from 'react'
import { useInventoryItems } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface StockAdjustmentProps {
  // FIX: accept product_id + warehouse_id instead of itemId
  productId?: string
  warehouseId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const adjustmentReasons = [
  { value: 'Physical Recount', label: 'Physical Recount' },
  { value: 'Damaged Items', label: 'Damaged Items' },
  { value: 'Lost Items', label: 'Lost Items' },
  { value: 'Expired Items', label: 'Expired Items' },
  { value: 'Theft/Shrinkage', label: 'Theft / Shrinkage' },
  { value: 'Data Correction', label: 'Data Correction' },
  { value: 'Transfer Adjustment', label: 'Transfer Adjustment' },
  { value: 'Other', label: 'Other' },
]

export function StockAdjustment({ productId, warehouseId, onSuccess, onCancel }: StockAdjustmentProps) {
  const { inventoryItems, adjustStock } = useInventoryItems()

  // If productId + warehouseId are pre-set (coming from detail page), use them
  // Otherwise let user pick from the list
  const [selectedProductId, setSelectedProductId] = useState(productId || '')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouseId || '')

  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: 'add' as 'add' | 'subtract' | 'set',
    quantity: '',
    reason: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Find the matching inventory item to show current stock
  const selectedItem = inventoryItems.find(
    item => item.product_id === selectedProductId && item.warehouse_id === selectedWarehouseId
  )

  const calculateNewStock = () => {
    if (!selectedItem || !adjustmentData.quantity) return null
    const qty = parseInt(adjustmentData.quantity)
    const current = selectedItem.quantity
    switch (adjustmentData.adjustment_type) {
      case 'add': return current + qty
      case 'subtract': return Math.max(0, current - qty)
      case 'set': return qty
      default: return current
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedProductId) newErrors.product = 'Please select a product'
    if (!selectedWarehouseId) newErrors.warehouse = 'Please select a warehouse'
    if (!adjustmentData.quantity) {
      newErrors.quantity = 'Quantity is required'
    } else if (isNaN(parseInt(adjustmentData.quantity)) || parseInt(adjustmentData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number'
    }
    if (!adjustmentData.reason) newErrors.reason = 'Reason is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const qty = parseInt(adjustmentData.quantity)

    // FIX: Convert adjustment_type to adjustment_quantity for backend
    let adjustment_quantity: number
    switch (adjustmentData.adjustment_type) {
      case 'add':
        adjustment_quantity = qty
        break
      case 'subtract':
        adjustment_quantity = -qty
        break
      case 'set': {
        // For 'set', calculate the delta from current stock
        const current = selectedItem?.quantity ?? 0
        adjustment_quantity = qty - current
        break
      }
    }

    setIsSubmitting(true)
    try {
      // FIX: send product_id, warehouse_id, adjustment_quantity, reason, notes
      await adjustStock({
        product_id: selectedProductId,
        warehouse_id: selectedWarehouseId,
        adjustment_quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes
      })

      onSuccess?.()
      setAdjustmentData({ adjustment_type: 'add', quantity: '', reason: '', notes: '' })
      if (!productId) { setSelectedProductId(''); setSelectedWarehouseId('') }

    } catch (error) {
      console.error('Failed to adjust stock:', error)
      setErrors({ submit: 'Failed to adjust stock. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const newStock = calculateNewStock()
  const isIncrease = newStock !== null && selectedItem && newStock > selectedItem.quantity
  const isDecrease = newStock !== null && selectedItem && newStock < selectedItem.quantity

  // Build unique product options from inventory items
  const productOptions = inventoryItems.reduce<{ id: string; name: string; sku: string }[]>((acc, item) => {
    if (!acc.find(p => p.id === item.product_id)) {
      acc.push({ id: item.product_id, name: item.product_name, sku: item.product_sku })
    }
    return acc
  }, [])

  // Warehouses for selected product
  const warehouseOptions = inventoryItems
    .filter(item => item.product_id === selectedProductId)
    .map(item => ({ id: item.warehouse_id ?? '', name: item.warehouse_name }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <span>Stock Adjustment</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Product selector — only shown when not pre-set */}
          {!productId && (
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => {
                  setSelectedProductId(value)
                  setSelectedWarehouseId('')
                  if (errors.product) setErrors(prev => ({ ...prev, product: '' }))
                }}
              >
                <SelectTrigger className={errors.product ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product && <p className="text-sm text-destructive">{errors.product}</p>}
            </div>
          )}

          {/* Warehouse selector — only shown when not pre-set */}
          {!warehouseId && selectedProductId && (
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select
                value={selectedWarehouseId}
                onValueChange={(value) => {
                  setSelectedWarehouseId(value)
                  if (errors.warehouse) setErrors(prev => ({ ...prev, warehouse: '' }))
                }}
              >
                <SelectTrigger className={errors.warehouse ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouse && <p className="text-sm text-destructive">{errors.warehouse}</p>}
            </div>
          )}

          {/* Current stock display */}
          {selectedItem && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{selectedItem.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedItem.warehouse_name} · SKU: {selectedItem.product_sku}
                      </p>
                    </div>
                    {selectedItem.needs_reorder && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Low Stock
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current Quantity:</span>
                      <div className="font-medium">{selectedItem.quantity}</div>
                    </div>
                    {newStock !== null && (
                      <div>
                        <span className="text-muted-foreground">New Quantity:</span>
                        <div className={`font-medium flex items-center space-x-1 ${
                          isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : ''
                        }`}>
                          {isIncrease && <TrendingUp className="h-4 w-4" />}
                          {isDecrease && <TrendingDown className="h-4 w-4" />}
                          <span>{newStock}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adjustment type + quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Adjustment Type *</Label>
              <Select
                value={adjustmentData.adjustment_type}
                onValueChange={(value) => handleInputChange('adjustment_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to Stock</SelectItem>
                  <SelectItem value="subtract">Remove from Stock</SelectItem>
                  <SelectItem value="set">Set Exact Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={adjustmentData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Enter quantity"
                className={errors.quantity ? 'border-destructive' : ''}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select
              value={adjustmentData.reason}
              onValueChange={(value) => handleInputChange('reason', value)}
            >
              <SelectTrigger className={errors.reason ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select adjustment reason" />
              </SelectTrigger>
              <SelectContent>
                {adjustmentReasons.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={adjustmentData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this adjustment..."
              rows={3}
            />
          </div>

          {/* Warning: subtract would go below zero */}
          {adjustmentData.adjustment_type === 'subtract' && selectedItem &&
            adjustmentData.quantity &&
            parseInt(adjustmentData.quantity) > selectedItem.quantity && (
              <div className="bg-destructive/10 border border-destructive p-4 rounded flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Warning</p>
                  <p className="text-sm text-destructive">
                    Quantity exceeds current stock. Stock will be set to 0.
                  </p>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedProductId ||
                !selectedWarehouseId ||
                !adjustmentData.quantity ||
                !adjustmentData.reason
              }
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Adjusting...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}