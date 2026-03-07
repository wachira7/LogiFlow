// src/components/inventory/inventory-items/BulkStockUpdate.tsx
'use client'

import { useState, useEffect } from 'react'
import { useInventoryItems, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PackageCheck, Download, CheckCircle, AlertTriangle } from 'lucide-react'

interface BulkUpdateItem {
  // FIX: track product_id + warehouse_id for correct payload
  id: string
  product_id: string
  warehouse_id: string
  name: string       // from product_name
  sku: string        // from product_sku
  warehouse_name: string
  current_stock: number  // from quantity
  new_stock: string
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
  const { warehouses } = useWarehouses()
  const [items, setItems] = useState<BulkUpdateItem[]>([])

  // Only filters that backend actually supports
  const [searchQuery, setSearchQuery] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  const [bulkOperation, setBulkOperation] = useState({
    action: '', // 'set', 'add', 'subtract'
    value: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  // FIX: map backend fields correctly — product_name, product_sku, quantity
  useEffect(() => {
    const filtered = inventoryItems.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!item.product_name.toLowerCase().includes(q) &&
            !item.product_sku.toLowerCase().includes(q)) {
          return false
        }
      }
      if (warehouseFilter && item.warehouse_id !== warehouseFilter) return false
      return true
    })

    setItems(filtered.map(item => ({
      id: item.id,
      product_id: item.product_id,
      warehouse_id: item.warehouse_id ?? '',
      name: item.product_name,
      sku: item.product_sku,
      warehouse_name: item.warehouse_name,
      current_stock: item.quantity,
      new_stock: item.quantity.toString(),
      selected: false
    })))
  }, [inventoryItems, searchQuery, warehouseFilter])

  const selectedItems = items.filter(i => i.selected)
  const validSelectedItems = selectedItems.filter(i => !i.hasError)

  const toggleSelectAll = () => {
    const allSelected = items.every(i => i.selected)
    setItems(items.map(i => ({ ...i, selected: !allSelected })))
  }

  const toggleSelectItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, selected: !i.selected } : i))
  }

  const updateItemStock = (id: string, newStock: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const hasError = isNaN(parseInt(newStock)) || parseInt(newStock) < 0
      return { ...item, new_stock: newStock, hasError, errorMessage: hasError ? 'Invalid quantity' : undefined }
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
        case 'set': newStock = value; break
        case 'add': newStock = item.current_stock + value; break
        case 'subtract': newStock = Math.max(0, item.current_stock - value); break
        default: return item
      }
      return { ...item, new_stock: newStock.toString(), hasError: false, errorMessage: undefined }
    }))
  }

  const validateItems = (): boolean => {
    const updated = items.map(item => {
      if (!item.selected) return item
      const qty = parseInt(item.new_stock)
      const hasError = isNaN(qty) || qty < 0
      return { ...item, hasError, errorMessage: hasError ? 'Invalid quantity' : undefined }
    })
    setItems(updated)
    return updated.filter(i => i.selected && i.hasError).length === 0
  }

  const handleSubmit = async () => {
    if (!validateItems()) return
    if (validSelectedItems.length === 0) return

    setIsSubmitting(true)
    setSubmitProgress(0)

    try {
      // FIX: pass product_id + warehouse_id instead of item_id
      const updates = validSelectedItems.map(item => ({
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        new_stock: parseInt(item.new_stock),
        notes: bulkOperation.notes
      }))

      for (let i = 0; i <= updates.length; i++) {
        setSubmitProgress((i / updates.length) * 100)
        if (i < updates.length) await new Promise(r => setTimeout(r, 80))
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
      ['Product Name', 'SKU', 'Warehouse', 'Current Quantity', 'New Quantity'],
      ...items.map(item => [item.name, item.sku, item.warehouse_name, item.current_stock, ''])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-stock-update-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Stock Update</h2>
          <p className="text-muted-foreground">Update multiple items at once</p>
        </div>
        <Button variant="outline" onClick={exportTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Export Template
        </Button>
      </div>

      {/* Filters — only search + warehouse (fields that exist on backend) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                onChange={(e) => setBulkOperation({ ...bulkOperation, action: e.target.value })}
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
                onChange={(e) => setBulkOperation({ ...bulkOperation, value: e.target.value })}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={bulkOperation.notes}
                onChange={(e) => setBulkOperation({ ...bulkOperation, notes: e.target.value })}
                placeholder="Optional notes"
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
              <Badge variant="outline">{selectedItems.length} selected</Badge>
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found. Try adjusting your search or warehouse filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={items.length > 0 && items.every(i => i.selected)}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Current Qty</TableHead>
                  <TableHead>New Qty</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const stockChange = parseInt(item.new_stock) - item.current_stock
                  return (
                    <TableRow key={item.id} className={item.hasError ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.warehouse_name}</TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.new_stock}
                            onChange={(e) => updateItemStock(item.id, e.target.value)}
                            className={`w-24 ${item.hasError ? 'border-destructive' : ''}`}
                          />
                          {item.hasError && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </div>
                        {item.errorMessage && (
                          <p className="text-xs text-destructive mt-1">{item.errorMessage}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isNaN(stockChange) && stockChange !== 0 && (
                          <span className={stockChange > 0 ? 'text-green-600' : 'text-red-600'}>
                            {stockChange > 0 ? `+${stockChange}` : stockChange}
                          </span>
                        )}
                        {(isNaN(stockChange) || stockChange === 0) && (
                          <span className="text-muted-foreground">—</span>
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
            onChange={(e) => setBulkOperation({ ...bulkOperation, notes: e.target.value })}
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