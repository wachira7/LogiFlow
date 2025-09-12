// /src/components/inventory/categories/CategoryForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategorySelector } from './CategorySelector'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, FolderTree } from 'lucide-react'

interface CategoryFormProps {
  categoryId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface CategoryFormData {
  name: string
  description: string
  parent_id: string
  is_active: boolean
}

export function CategoryForm({ categoryId, onSuccess, onCancel }: CategoryFormProps) {
  const { categories, createCategory, updateCategory, isLoading } = useCategories()
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!categoryId
  const currentCategory = categories.find(cat => cat.id === categoryId)

  // Load existing category data for editing
  useEffect(() => {
    if (isEditing && currentCategory) {
      setFormData({
        name: currentCategory.name,
        description: currentCategory.description || '',
        parent_id: currentCategory.parent_id || '',
        is_active: currentCategory.is_active
      })
    }
  }, [isEditing, currentCategory])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    }

    if (formData.name.length > 100) {
      newErrors.name = 'Category name must be less than 100 characters'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    // Check for circular parent relationship
    if (formData.parent_id === categoryId) {
      newErrors.parent_id = 'Category cannot be its own parent'
    }

    // Check if parent is a descendant (would create a cycle)
    if (isEditing && formData.parent_id) {
      const isDescendant = (parentId: string, checkId: string): boolean => {
        const parent = categories.find(cat => cat.id === parentId)
        if (!parent) return false
        if (parent.parent_id === checkId) return true
        if (parent.parent_id) return isDescendant(parent.parent_id, checkId)
        return false
      }

      if (isDescendant(formData.parent_id, categoryId!)) {
        newErrors.parent_id = 'Cannot set a descendant category as parent'
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
        parent_id: formData.parent_id || null
      }

      if (isEditing) {
        await updateCategory(categoryId!, submitData)
      } else {
        await createCategory(submitData)
      }

      onSuccess?.()
    } catch (error) {
      console.error('Failed to save category:', error)
      setErrors({ submit: 'Failed to save category. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FolderTree className="h-5 w-5" />
          <span>{isEditing ? 'Edit Category' : 'Create New Category'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Category Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter category name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <CategorySelector
              value={formData.parent_id}
              onValueChange={(value) => handleInputChange('parent_id', value)}
              label="Parent Category"
              placeholder="Select parent category (optional)"
              className={errors.parent_id ? 'border-destructive' : ''}
              showInactive={false}
            />
          </div>

          {errors.parent_id && (
            <p className="text-sm text-destructive">{errors.parent_id}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter category description (optional)"
              rows={4}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {formData.description.length}/500 characters
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Category</Label>
          </div>

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}