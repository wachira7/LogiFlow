// /app/inventory/inventory-items/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInventoryItems, useCategories, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Package, AlertTriangle } from 'lucide-react'

export default function NewInventoryItemPage() {
  const router = useRouter()
  const { createInventoryItem } = useInventoryItems()
  const { categories } = useCategories()
  const { warehouses } = useWarehouses()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    warehouse_id: '',
    product_id: '',
    unit_of_measure: '',
    cost_price: '',
    unit_price: '',
    current_stock: '',
    quantity: '',
    minimum_stock: '',
    maximum_stock: '',
    reorder_point: '',
    supplier_name: '',
    supplier_sku: '',
    barcode: '',
    weight: '',
    dimensions: '',
    notes: '',
    is_active: true,
    track_stock: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.sku || !formData.category_id) return

    setIsLoading(true)
    try {
      const itemData = {
        ...formData,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : undefined,
        current_stock: formData.current_stock ? parseInt(formData.current_stock) : 0,
       minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : undefined,
        maximum_stock: formData.maximum_stock ? parseInt(formData.maximum_stock) : undefined,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        quantity: formData.quantity ? parseInt(formData.quantity) : 0
      }
      await createInventoryItem(itemData)
      router.push('/inventory/inventory-items')
    } catch (error) {
      console.error('Failed to create inventory item:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isLowStock = formData.current_stock && formData.reorder_point && 
    parseInt(formData.current_stock) <= parseInt(formData.reorder_point)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/inventory/inventory-items">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Inventory Item</h1>
          <p className="text-muted-foreground">Create a new inventory item</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="ITEM001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.is_active).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse</Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter(wh => wh.is_active).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit of Measure</Label>
                <Select
                  value={formData.unit_of_measure}
                  onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ea">Each (ea)</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="lb">Pound (lb)</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                    <SelectItem value="gallon">Gallon</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="foot">Foot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="product_id">Product ID</Label>
                <Input
                  id="product_id"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  placeholder="Enter product ID (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock Information</span>
              {isLowStock && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Low Stock</span>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="track_stock"
                checked={formData.track_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
              />
              <Label htmlFor="track_stock">Track Stock Levels</Label>
            </div>

            {formData.track_stock && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimum Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maximum_stock">Maximum Stock</Label>
                  <Input
                    id="maximum_stock"
                    type="number"
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_point">Reorder Point</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier & Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier & Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_sku">Supplier SKU</Label>
                <Input
                  id="supplier_sku"
                  value={formData.supplier_sku}
                  onChange={(e) => setFormData({ ...formData, supplier_sku: e.target.value })}
                  placeholder="Supplier's product code"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Barcode number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Weight in kg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="L x W x H"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this item"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active Item</Label>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Link href="/inventory/inventory-items">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isLoading || !formData.name || !formData.sku || !formData.category_id}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Creating...' : 'Create Item'}
          </Button>
        </div>
      </form>
    </div>
  )
}