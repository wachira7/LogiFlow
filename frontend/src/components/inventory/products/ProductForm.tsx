// /src/components/inventory/products/ProductForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useProducts } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategorySelector } from '../categories/CategorySelector'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Package2 } from 'lucide-react'

interface ProductFormProps {
  productId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface ProductFormData {
  name: string
  sku: string
  description: string
  category_id: string
  cost_price: string
  selling_price: string
  unit_of_measure: string
  weight: string
  dimensions: string
  barcode: string
  supplier_name: string
  supplier_sku: string
  track_stock: boolean
  minimum_stock: string
  maximum_stock: string
  reorder_point: string
  notes: string
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
  { value: 'foot', label: 'Foot' }
]

export function ProductForm({ productId, onSuccess, onCancel }: ProductFormProps) {
  const { products, createProduct, updateProduct, isLoading } = useProducts()
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    unit_of_measure: '',
    weight: '',
    dimensions: '',
    barcode: '',
    supplier_name: '',
    supplier_sku: '',
    track_stock: true,
    minimum_stock: '',
    maximum_stock: '',
    reorder_point: '',
    notes: '',
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!productId
  const currentProduct = products.find(prod => prod.id === productId)

  // Load existing product data for editing
  useEffect(() => {
    if (isEditing && currentProduct) {
      setFormData({
        name: currentProduct.name,
        sku: currentProduct.sku,
        description: currentProduct.description || '',
        category_id: currentProduct.category_id,
        cost_price: currentProduct.cost_price?.toString() || '',
        selling_price: currentProduct.selling_price?.toString() || '',
        unit_of_measure: currentProduct.unit_of_measure || '',
        weight: currentProduct.weight?.toString() || '',
        dimensions: currentProduct.dimensions || '',
        barcode: currentProduct.barcode || '',
        supplier_name: currentProduct.supplier_name || '',
        supplier_sku: currentProduct.supplier_sku || '',
        track_stock: currentProduct.track_stock ?? true,
        minimum_stock: currentProduct.minimum_stock?.toString() || '',
        maximum_stock: currentProduct.maximum_stock?.toString() || '',
        reorder_point: currentProduct.reorder_point?.toString() || '',
        notes: currentProduct.notes || '',
        is_active: currentProduct.is_active
      })
    }
  }, [isEditing, currentProduct])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    if (formData.cost_price && isNaN(parseFloat(formData.cost_price))) {
      newErrors.cost_price = 'Cost price must be a valid number'
    }

    if (formData.selling_price && isNaN(parseFloat(formData.selling_price))) {
      newErrors.selling_price = 'Selling price must be a valid number'
    }

    if (formData.weight && isNaN(parseFloat(formData.weight))) {
      newErrors.weight = 'Weight must be a valid number'
    }

    // Stock validation when tracking is enabled
    if (formData.track_stock) {
      if (formData.minimum_stock && isNaN(parseInt(formData.minimum_stock))) {
        newErrors.minimum_stock = 'Minimum stock must be a valid number'
      }
      if (formData.maximum_stock && isNaN(parseInt(formData.maximum_stock))) {
        newErrors.maximum_stock = 'Maximum stock must be a valid number'
      }
      if (formData.reorder_point && isNaN(parseInt(formData.reorder_point))) {
        newErrors.reorder_point = 'Reorder point must be a valid number'
      }

      // Check if minimum is greater than maximum
      if (formData.minimum_stock && formData.maximum_stock && 
          parseInt(formData.minimum_stock) >= parseInt(formData.maximum_stock)) {
        newErrors.maximum_stock = 'Maximum stock must be greater than minimum stock'
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
      const submitData = {
        ...formData,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : undefined,
        maximum_stock: formData.maximum_stock ? parseInt(formData.maximum_stock) : undefined,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        reorder_level: formData.reorder_point ? parseInt(formData.reorder_point) : 0,
        reorder_quantity: formData.maximum_stock ? parseInt(formData.maximum_stock) : 0
      }

      if (isEditing) {
        await updateProduct(productId!, submitData)
      } else {
        await createProduct(submitData)
      }

      onSuccess?.()
    } catch (error) {
      console.error('Failed to save product:', error)
      setErrors({ submit: 'Failed to save product. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
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
              label="Category *"
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
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                placeholder="0.00"
                className={errors.cost_price ? 'border-destructive' : ''}
              />
              {errors.cost_price && <p className="text-sm text-destructive">{errors.cost_price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => handleInputChange('selling_price', e.target.value)}
                placeholder="0.00"
                className={errors.selling_price ? 'border-destructive' : ''}
              />
              {errors.selling_price && <p className="text-sm text-destructive">{errors.selling_price}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Management */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="track_stock"
              checked={formData.track_stock}
              onCheckedChange={(checked) => handleInputChange('track_stock', checked)}
            />
            <Label htmlFor="track_stock">Track Stock Levels</Label>
          </div>

          {formData.track_stock && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_stock">Minimum Stock</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => handleInputChange('minimum_stock', e.target.value)}
                  placeholder="0"
                  className={errors.minimum_stock ? 'border-destructive' : ''}
                />
                {errors.minimum_stock && <p className="text-sm text-destructive">{errors.minimum_stock}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximum_stock">Maximum Stock</Label>
                <Input
                  id="maximum_stock"
                  type="number"
                  value={formData.maximum_stock}
                  onChange={(e) => handleInputChange('maximum_stock', e.target.value)}
                  placeholder="0"
                  className={errors.maximum_stock ? 'border-destructive' : ''}
                />
                {errors.maximum_stock && <p className="text-sm text-destructive">{errors.maximum_stock}</p>}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_sku">Supplier SKU</Label>
              <Input
                id="supplier_sku"
                value={formData.supplier_sku}
                onChange={(e) => handleInputChange('supplier_sku', e.target.value)}
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
                onChange={(e) => handleInputChange('barcode', e.target.value)}
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
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="Weight in kg"
                className={errors.weight ? 'border-destructive' : ''}
              />
              {errors.weight && <p className="text-sm text-destructive">{errors.weight}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange('dimensions', e.target.value)}
                placeholder="L x W x H"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this product"
              rows={3}
            />
          </div>

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

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !formData.name.trim() || !formData.sku.trim() || !formData.category_id}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}