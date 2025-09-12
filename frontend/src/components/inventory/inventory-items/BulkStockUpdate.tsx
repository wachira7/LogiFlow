// /src/components/inventory/inventory-items/BulkStockUpdate.tsx
'use client'

import { useState, useEffect } from 'react'
import { useInventoryItems } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  PackageCheck, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Filter,
  FilterX
} from 'lucide-react'
import { InventoryFilters } from '../shared/InventoryFilters'

interface BulkUpdateItem {
  id: string
  name: string
  sku: string
  current_stock: number
  new_stock: string
  unit_of_measure?: string
  selected: boolean
  hasError?: boolean
  errorMessage?: string
}

interface BulkStockUpdateProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function BulkStockUpdate({ onSuccess, onCancel }: BulkStockUpdateProps) {
  const { inventoryItems, bulkUpdateStock } = useInventoryItems()
  const [items, setItems] = useState<BulkUpdateItem[]>([])
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    warehouse_id: '',
    stock_status: '',
    is_active: 'true',
    unit_of_measure: ''
  })
  const [bulkOperation, setBulkOperation] = useState({
    action: '', // 'set', 'add', 'subtract'
    value: '',
    reason: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [showFilters, setShowFilters] = useState(true)

  // Initialize items from inventory when filters change
  useEffect(() => {
    const filteredInventory = inventoryItems.filter(item => {
      if (!item.track_stock || !item.is_active) return false
      
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !item.sku.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.category_id && item.category_id !== filters.category_id) return false
      if (filters.warehouse_id && item.warehouse_id !== filters.warehouse_id) return false
      if (filters.unit_of_measure && item.unit_of_measure !== filters.unit_of_measure) return false
      
      return true
    })

    setItems(filteredInventory.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      current_stock: item.current_stock || 0,
      new_stock: (item.current_stock || 0).toString(),
      unit_of_measure: item.unit_of_measure,
      selected: false
    })))
  }, [inventoryItems, filters])

  const selectedItems = items.filter(item => item.selected)
  const validSelectedItems = selectedItems.filter(item => !item.hasError)

  const toggleSelectAll = () => {
    const allSelected = items.every(item => item.selected)
    setItems(items.map(item => ({ ...item, selected: !allSelected })))
  }

  const toggleSelectItem = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ))
  }

  const updateItemStock = (itemId: string, newStock: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const hasError = isNaN(parseInt(newStock)) || parseInt(newStock) < 0
        return {
          ...item,
          new_stock: newStock,
          hasError,
          errorMessage: hasError ? 'Invalid quantity' : undefined
        }
      }
      return item
    }))
  }

  const applyBulkOperation = () => {
    if (!bulkOperation.action || !bulkOperation.value) return

    const value = parseInt(bulkOperation.value)
    if (isNaN(value)) return

    setItems(items.map(item => {
      if (!item.selected) return item

      let newStock: number
      switch (bulkOperation.action) {
        case 'set':
          newStock = value
          break
        case 'add':
          newStock = item.current_stock + value
          break
        case 'subtract':
          newStock = Math.max(0, item.current_stock - value)
          break
        default:
          return item
      }

      return {
        ...item,
        new_stock: newStock.toString(),
        hasError: false,
        errorMessage: undefined
      }
    }))
  }

  const validateItems = (): boolean => {
    const updatedItems = items.map(item => {
      if (!item.selected) return item

      const newStock = parseInt(item.new_stock)
      const hasError = isNaN(newStock) || newStock < 0
      
      return {
        ...item,
        hasError,
        errorMessage: hasError ? 'Invalid quantity' : undefined
      }
    })

    setItems(updatedItems)
    return updatedItems.filter(item => item.selected && item.hasError).length === 0
  }

  const handleSubmit = async () => {
    if (!validateItems()) return
    if (validSelectedItems.length === 0) return

    setIsSubmitting(true)
    setSubmitProgress(0)

    try {
      const updates = validSelectedItems.map(item => ({
        item_id: item.id,
        new_stock: parseInt(item.new_stock),
        reason: bulkOperation.reason || 'Bulk update',
        notes: bulkOperation.notes,
        adjustment_type: 'set' as const, // Add required field
        quantity: parseInt(item.new_stock), // Add required field
      }))

      // Simulate progress for better UX
      for (let i = 0; i <= updates.length; i++) {
        setSubmitProgress((i / updates.length) * 100)
        if (i < updates.length) {
          // In real implementation, you'd process items individually or in batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      await bulkUpdateStock(updates)
      onSuccess?.()
      
    } catch (error) {
      console.error('Failed to update stock:', error)
    } finally {
      setIsSubmitting(false)
      setSubmitProgress(0)
    }
  }

  const exportTemplate = () => {
    const csvContent = [
      ['SKU', 'Name', 'Current Stock', 'New Stock'],
      ...items.map(item => [item.sku, item.name, item.current_stock, ''])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-stock-update-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleToggleFilters = () => {
    setShowFilters(prevShowFilters => !prevShowFilters)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Stock Update</h2>
          <p className="text-muted-foreground">Update multiple items at once</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleToggleFilters}>
            {showFilters ? (
              <>
                <FilterX className="h-4 w-4 mr-2" />
                Hide Filters
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Show Filters
              </>
            )}
          </Button>
          <Button variant="outline" onClick={exportTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Export Template
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <InventoryFilters
          filters={filters}
          onFiltersChange={setFilters}
          showStockStatus={false}
          showWarehouse={true}
          showUnitFilter={true}
        />
      )}

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <select
                className="w-full p-2 border rounded"
                value={bulkOperation.action}
                onChange={(e) => setBulkOperation({...bulkOperation, action: e.target.value})}
              >
                <option value="">Select action</option>
                <option value="set">Set to value</option>
                <option value="add">Add to current</option>
                <option value="subtract">Subtract from current</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                value={bulkOperation.value}
                onChange={(e) => setBulkOperation({...bulkOperation, value: e.target.value})}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={bulkOperation.reason}
                onChange={(e) => setBulkOperation({...bulkOperation, reason: e.target.value})}
                placeholder="Adjustment reason"
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={applyBulkOperation}
                disabled={!bulkOperation.action || !bulkOperation.value || selectedItems.length === 0}
                className="w-full"
              >
                Apply to Selected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Items ({items.length})</span>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                {selectedItems.length} selected
              </Badge>
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found. Adjust your filters to see items.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={items.length > 0 && items.every(item => item.selected)}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const stockChange = parseInt(item.new_stock) - item.current_stock
                  const isIncrease = stockChange > 0
                  const isDecrease = stockChange < 0
                  
                  return (
                    <TableRow key={item.id} className={item.hasError ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        {item.current_stock} {item.unit_of_measure}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.new_stock}
                            onChange={(e) => updateItemStock(item.id, e.target.value)}
                            className={`w-24 ${item.hasError ? 'border-destructive' : ''}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.unit_of_measure}
                          </span>
                          {item.hasError && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        {item.errorMessage && (
                          <p className="text-xs text-destructive mt-1">{item.errorMessage}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {stockChange !== 0 && (
                          <div className={`flex items-center space-x-1 ${
                            isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : ''
                          }`}>
                            {isIncrease && <span>+{stockChange}</span>}
                            {isDecrease && <span>{stockChange}</span>}
                            {stockChange === 0 && <span>No change</span>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bulkOperation.notes}
            onChange={(e) => setBulkOperation({...bulkOperation, notes: e.target.value})}
            placeholder="Add notes about this bulk update..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Progress */}
      {isSubmitting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Updating stock levels...</span>
                <span className="text-sm text-muted-foreground">{Math.round(submitProgress)}%</span>
              </div>
              <Progress value={submitProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || validSelectedItems.length === 0}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Updating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Update {validSelectedItems.length} Items
            </>
          )}
        </Button>
      </div>
    </div>
  )
}