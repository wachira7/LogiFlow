// /src/components/inventory/inventory-items/StockAdjustment.tsx
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
import { StockLevelIndicator } from './StockLevelIndicator'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface StockAdjustmentProps {
  itemId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const adjustmentReasons = [
  { value: 'recount', label: 'Physical Recount' },
  { value: 'damaged', label: 'Damaged Items' },
  { value: 'lost', label: 'Lost Items' },
  { value: 'expired', label: 'Expired Items' },
  { value: 'theft', label: 'Theft/Shrinkage' },
  { value: 'correction', label: 'Data Correction' },
  { value: 'transfer', label: 'Transfer Adjustment' },
  { value: 'other', label: 'Other' }
]

export function StockAdjustment({ itemId, onSuccess, onCancel }: StockAdjustmentProps) {
  const { inventoryItems, adjustStock } = useInventoryItems()
  const [selectedItemId, setSelectedItemId] = useState(itemId || '')
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: 'set', // 'add', 'subtract', 'set'
    quantity: '',
    reason: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedItem = inventoryItems.find(item => item.id === selectedItemId)

  const calculateNewStock = () => {
    if (!selectedItem || !adjustmentData.quantity) return null
    
    const adjustmentQty = parseInt(adjustmentData.quantity)
    const currentStock = selectedItem.current_stock || 0
    
    switch (adjustmentData.adjustment_type) {
      case 'add':
        return currentStock + adjustmentQty
      case 'subtract':
        return Math.max(0, currentStock - adjustmentQty)
      case 'set':
        return adjustmentQty
      default:
        return currentStock
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedItemId) {
      newErrors.item = 'Please select an inventory item'
    }

    if (!adjustmentData.quantity) {
      newErrors.quantity = 'Adjustment quantity is required'
    } else if (isNaN(parseInt(adjustmentData.quantity)) || parseInt(adjustmentData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a positive number'
    }

    if (!adjustmentData.reason) {
      newErrors.reason = 'Adjustment reason is required'
    }

    // Check if subtraction would result in negative stock
    if (adjustmentData.adjustment_type === 'subtract' && selectedItem) {
      const adjustmentQty = parseInt(adjustmentData.quantity)
      if (adjustmentQty > (selectedItem.current_stock || 0)) {
        newErrors.quantity = 'Cannot subtract more than current stock'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await adjustStock(selectedItemId, {
        adjustment_type: adjustmentData.adjustment_type as 'set' | 'add' | 'subtract' | 'INCREASE' | 'DECREASE' | 'SET',
        quantity: parseInt(adjustmentData.quantity),
        reason: adjustmentData.reason,
        notes: adjustmentData.notes
      })

      onSuccess?.()
      
      // Reset form
      setAdjustmentData({
        adjustment_type: 'set',
        quantity: '',
        reason: '',
        notes: ''
      })
      if (!itemId) setSelectedItemId('')
      
    } catch (error) {
      console.error('Failed to adjust stock:', error)
      setErrors({ submit: 'Failed to adjust stock. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const newStock = calculateNewStock()
  const isStockIncrease = newStock !== null && selectedItem && newStock > (selectedItem.current_stock || 0)
  const isStockDecrease = newStock !== null && selectedItem && newStock < (selectedItem.current_stock || 0)

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

          {/* Item Selection */}
          {!itemId && (
            <div className="space-y-2">
              <Label>Select Inventory Item *</Label>
              <Select
                value={selectedItemId}
                onValueChange={(value) => {
                  setSelectedItemId(value)
                  if (errors.item) {
                    setErrors(prev => ({ ...prev, item: '' }))
                  }
                }}
              >
                <SelectTrigger className={errors.item ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Choose an item to adjust" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems
                    .filter(item => item.is_active && item.track_stock)
                    .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{item.name} ({item.sku})</span>
                        <Badge variant="outline" className="ml-2">
                          {item.current_stock || 0} {item.unit_of_measure}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.item && <p className="text-sm text-destructive">{errors.item}</p>}
            </div>
          )}

          {/* Current Stock Display */}
          {selectedItem && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{selectedItem.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {selectedItem.sku}</p>
                    </div>
                    <StockLevelIndicator
                      currentStock={selectedItem.current_stock || 0}
                      minimumStock={selectedItem.minimum_stock}
                      maximumStock={selectedItem.maximum_stock}
                      reorderPoint={selectedItem.reorder_point}
                      variant="badge"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current Stock:</span>
                      <div className="font-medium">
                        {selectedItem.current_stock || 0} {selectedItem.unit_of_measure}
                      </div>
                    </div>
                    {newStock !== null && (
                      <div>
                        <span className="text-muted-foreground">New Stock:</span>
                        <div className={`font-medium flex items-center space-x-1 ${
                          isStockIncrease ? 'text-green-600' : isStockDecrease ? 'text-red-600' : ''
                        }`}>
                          {isStockIncrease && <TrendingUp className="h-4 w-4" />}
                          {isStockDecrease && <TrendingDown className="h-4 w-4" />}
                          <span>{newStock} {selectedItem.unit_of_measure}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adjustment Details */}
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
                min="0"
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
                {adjustmentReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
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

          {/* Warning for stock reduction */}
          {adjustmentData.adjustment_type === 'subtract' && selectedItem && 
           adjustmentData.quantity && 
           parseInt(adjustmentData.quantity) > (selectedItem.current_stock || 0) && (
            <div className="bg-destructive/10 border border-destructive p-4 rounded flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Warning</p>
                <p className="text-sm text-destructive">
                  This adjustment would reduce stock below zero. The system will set stock to 0.
                </p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedItemId || !adjustmentData.quantity || !adjustmentData.reason}
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