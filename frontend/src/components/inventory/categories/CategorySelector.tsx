// /src/components/inventory/categories/CategorySelector.tsx
'use client'

import { useCategories } from '@/hooks/useInventory'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FolderTree, AlertTriangle } from 'lucide-react'
import { Category } from '@/types/inventory.types'

interface CategorySelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  showInactive?: boolean
  excludeCategoryId?: string 
}

export function CategorySelector({
  value,
  onValueChange,
  placeholder = "Select category",
  label,
  required = false,
  className,
  showInactive = false,
  excludeCategoryId
}: CategorySelectorProps) {
  const { categories, isLoading } = useCategories()

  const filteredCategories = categories?.filter(category => 
    showInactive ? true : category.is_active &&
    category.id !== excludeCategoryId
  ) || []

  // Group categories by parent for better organization
  const topLevelCategories = filteredCategories.filter(cat => !cat.parent_id)
  const childCategories = filteredCategories.filter(cat => cat.parent_id)

  const getCategoryDisplay = (category: Category) => {
    const parentCategory = categories.find(cat => cat.id === category.parent_id)
    return parentCategory 
      ? `${parentCategory.name} > ${category.name}`
      : category.name
  }

  if (isLoading) {
    return (
      <div className={className}>
        {label && (
          <Label className="text-sm font-medium mb-2 block">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex items-center justify-center h-10 border rounded-md">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!categories || categories.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <div>
                <div>No categories found</div>
                <div className="text-xs mt-1">Create a category first</div>
              </div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <FolderTree className="h-4 w-4 mr-2" />
              No active categories available
            </div>
          ) : (
            <>
              {/* Top level categories first */}
              {topLevelCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center">
                    <FolderTree className="h-4 w-4 mr-2" />
                    {category.name}
                    {!category.is_active && (
                      <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              
              {/* Child categories with parent context */}
              {childCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center">
                    <div className="w-4 mr-2" /> {/* Indent for child categories */}
                    <FolderTree className="h-3 w-3 mr-2 text-muted-foreground" />
                    {getCategoryDisplay(category)}
                    {!category.is_active && (
                      <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}