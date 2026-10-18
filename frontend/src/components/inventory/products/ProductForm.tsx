// src/components/inventory/products/ProductForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useProducts, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategorySelector } from '../categories/CategorySelector'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { inventoryService } from '@/services/inventoryService'
import { useRecordById } from '@/hooks/useRecordById'
import { Save, Package2 } from 'lucide-react'

interface ProductFormProps {
  productId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Only fields that exist in ProductCreateUpdateSerializer
interface ProductFormData {
  name: string
  sku: string
  description: string
  category_id: string
  cost_price: string
  unit_price: string
  unit_of_measure: string
  weight: string
  dimensions: string
  barcode: string
  min_stock_level: string
  max_stock_level: string
  reorder_point: string
  lead_time_days: string
  is_active: boolean
}

const unitOptions = [
  { value: 'ea', label: 'Each (ea)' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'liter', label: 'Liter' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'meter', label: 'Meter' },
  { value: 'foot', label: 'Foot' },
  { value: 'inch', label: 'Inch' },
  { value: 'cm', label: 'Centimeter' },
  { value: 'mm', label: 'Millimeter' },
]

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  description: '',
  category_id: '',
  cost_price: '',
  unit_price: '',
  unit_of_measure: '',
  weight: '',
  dimensions: '',
  barcode: '',
  min_stock_level: '',
  max_stock_level: '',
  reorder_point: '',
  lead_time_days: '',
  is_active: true,
}

export function ProductForm({ productId, onSuccess, onCancel }: ProductFormProps) {
  const { createProduct, updateProduct, isLoading } = useProducts()
  const { warehouses } = useWarehouses()
  // Optional on create: stock the new product straight away (recorded as a receipt)
  const [opening, setOpening] = useState({ warehouse_id: '', quantity: '', location: '' })
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!productId
  // Edit: load the full product (list rows lack description, barcode, stock levels...)
  const { record: currentProduct } = useRecordById(productId, (id) => inventoryService.getProduct(id))

  useEffect(() => {
    if (isEditing && currentProduct) {
      setFormData({
        name: currentProduct.name,
        sku: currentProduct.sku,
        description: currentProduct.description || '',
        category_id: currentProduct.category_id,
        cost_price: currentProduct.cost_price?.toString() || '',
        unit_price: currentProduct.unit_price?.toString() || '',
        unit_of_measure: currentProduct.unit_of_measure || '',
        weight: currentProduct.weight?.toString() || '',
        dimensions: currentProduct.dimensions || '',
        barcode: currentProduct.barcode || '',
        min_stock_level: currentProduct.min_stock_level?.toString() || '',
        max_stock_level: currentProduct.max_stock_level?.toString() || '',
        reorder_point: currentProduct.reorder_point?.toString() || '',
        lead_time_days: currentProduct.lead_time_days?.toString() || '',
        is_active: currentProduct.is_active,
      })
    }
  }, [isEditing, currentProduct])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Product name is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.category_id) newErrors.category_id = 'Category is required'

    if (formData.cost_price && isNaN(parseFloat(formData.cost_price)))
      newErrors.cost_price = 'Cost price must be a valid number'
    if (formData.unit_price && isNaN(parseFloat(formData.unit_price)))
      newErrors.unit_price = 'Unit price must be a valid number'
    if (formData.weight && isNaN(parseFloat(formData.weight)))
      newErrors.weight = 'Weight must be a valid number'
    if (formData.min_stock_level && isNaN(parseInt(formData.min_stock_level)))
      newErrors.min_stock_level = 'Must be a valid number'
    if (formData.max_stock_level && isNaN(parseInt(formData.max_stock_level)))
      newErrors.max_stock_level = 'Must be a valid number'
    if (formData.reorder_point && isNaN(parseInt(formData.reorder_point)))
      newErrors.reorder_point = 'Must be a valid number'

    if (formData.min_stock_level && formData.max_stock_level && parseInt(formData.max_stock_level) > 0 &&
        parseInt(formData.min_stock_level) > parseInt(formData.max_stock_level))
      newErrors.max_stock_level = 'Maximum must be at least the minimum'
    if (!isEditing && opening.quantity && (isNaN(parseInt(opening.quantity)) || parseInt(opening.quantity) < 0))
      newErrors.opening_quantity = 'Enter a whole number of units'
    if (!isEditing && opening.quantity && parseInt(opening.quantity) > 0 && !opening.warehouse_id)
      newErrors.opening_warehouse = 'Choose where this stock is kept'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Only send fields that exist in ProductCreateUpdateSerializer
      const submitData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        category_id: formData.category_id,
        unit_of_measure: formData.unit_of_measure || undefined,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        barcode: formData.barcode || undefined,
        min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : undefined,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : undefined,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : undefined,
        is_active: formData.is_active,
      }

      if (isEditing) {
        await updateProduct(productId!, submitData)
      } else {
        const created = await createProduct(submitData)
        const qty = parseInt(opening.quantity || '0', 10)
        if (created?.id && opening.warehouse_id) {
          const stocked = await inventoryService.createInventoryItem({
            product_id: created.id,
            warehouse_id: opening.warehouse_id,
            quantity: qty,
            location: opening.location,
          })
          if (!stocked.success) {
            setErrors({ submit: `Product created, but the opening stock wasn’t added: ${stocked.error}` })
            return
          }
        }
      }

      onSuccess?.()
    } catch (error) {
      setErrors({ submit: error instanceof Error && error.message ? error.message : 'Failed to save product. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package2 className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value.toUpperCase())}
                placeholder="PROD001"
                className={errors.sku ? 'border-destructive' : ''}
              />
              {errors.sku && <p className="text-sm text-destructive">{errors.sku}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategorySelector
              value={formData.category_id}
              onValueChange={(value) => handleInputChange('category_id', value)}
              label="Category"
              placeholder="Select category"
              required
              className={errors.category_id ? 'border-destructive' : ''}
            />
            <div className="space-y-2">
              <Label htmlFor="unit">Unit of Measure</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(value) => handleInputChange('unit_of_measure', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.category_id && <p className="text-sm text-destructive">{errors.category_id}</p>}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                placeholder="0.00"
                className={errors.cost_price ? 'border-destructive' : ''}
              />
              {errors.cost_price && <p className="text-sm text-destructive">{errors.cost_price}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => handleInputChange('unit_price', e.target.value)}
                placeholder="0.00"
                className={errors.unit_price ? 'border-destructive' : ''}
              />
              {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Management */}
      <Card>
        <CardHeader><CardTitle>Stock Management</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Min Stock Level</Label>
              <Input
                id="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                placeholder="0"
                className={errors.min_stock_level ? 'border-destructive' : ''}
              />
              {errors.min_stock_level && <p className="text-sm text-destructive">{errors.min_stock_level}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_stock_level">Max Stock Level</Label>
              <Input
                id="max_stock_level"
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => handleInputChange('max_stock_level', e.target.value)}
                placeholder="0"
                className={errors.max_stock_level ? 'border-destructive' : ''}
              />
              {errors.max_stock_level && <p className="text-sm text-destructive">{errors.max_stock_level}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                value={formData.reorder_point}
                onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                placeholder="0"
                className={errors.reorder_point ? 'border-destructive' : ''}
              />
              {errors.reorder_point && <p className="text-sm text-destructive">{errors.reorder_point}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (days)</Label>
              <Input
                id="lead_time_days"
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Details */}
      <Card>
        <CardHeader><CardTitle>Physical Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Barcode number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="0.00"
                className={errors.weight ? 'border-destructive' : ''}
              />
              {errors.weight && <p className="text-sm text-destructive">{errors.weight}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions (L x W x H)</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange('dimensions', e.target.value)}
                placeholder="e.g. 10x5x3 cm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opening stock (create only) */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Opening stock <span className="text-sm font-normal text-muted-foreground">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Already holding this product? Add the current quantity so stock levels are right from day one.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="opening_warehouse">Warehouse</Label>
                <Select value={opening.warehouse_id || 'none'} onValueChange={(v) => {
                  setOpening((o) => ({ ...o, warehouse_id: v === 'none' ? '' : v }))
                  setErrors((e) => ({ ...e, opening_warehouse: '' }))
                }}>
                  <SelectTrigger id="opening_warehouse" className="w-full"><SelectValue placeholder="Choose warehouse" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don’t add stock now</SelectItem>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.opening_warehouse && <p className="text-sm text-destructive">{errors.opening_warehouse}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening_quantity">Quantity on hand</Label>
                <Input id="opening_quantity" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={opening.quantity} onChange={(e) => {
                    setOpening((o) => ({ ...o, quantity: e.target.value }))
                    setErrors((er) => ({ ...er, opening_quantity: '' }))
                  }} />
                {errors.opening_quantity && <p className="text-sm text-destructive">{errors.opening_quantity}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening_location">Bin / shelf (optional)</Label>
                <Input id="opening_location" placeholder="e.g. Aisle 3, Shelf B" value={opening.location}
                  onChange={(e) => setOpening((o) => ({ ...o, location: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Product</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !formData.name.trim() || !formData.sku.trim() || !formData.category_id}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}