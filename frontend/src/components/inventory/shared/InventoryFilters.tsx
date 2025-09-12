// /src/components/inventory/shared/InventoryFilters.tsx
'use client'

import { useState } from 'react'
import {  useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, RotateCcw } from 'lucide-react'
import { CategorySelector } from '../categories/CategorySelector'

export interface InventoryFilters {
  search: string
  category_id: string
  warehouse_id: string
  stock_status: string
  is_active: string
  unit_of_measure: string
}

interface InventoryFiltersProps {
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
  showStockStatus?: boolean
  showWarehouse?: boolean
  showUnitFilter?: boolean
  className?: string
}

const stockStatusOptions = [
  { value: '', label: 'All Stock Levels' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'overstocked', label: 'Overstocked' }
]

const unitOptions = [
  { value: '', label: 'All Units' },
  { value: 'ea', label: 'Each (ea)' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'liter', label: 'Liter' },
  { value: 'gallon', label: 'Gallon' }
]

export function InventoryFilters({
  filters,
  onFiltersChange,
  showStockStatus = true,
  showWarehouse = true,
  showUnitFilter = false,
  className
}: InventoryFiltersProps) {
  const { warehouses } = useWarehouses()
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof InventoryFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category_id: '',
      warehouse_id: '',
      stock_status: '',
      is_active: '',
      unit_of_measure: ''
    })
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length - (filters.search ? 1 : 0)
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search - Always visible */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Expandable filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <CategorySelector
              value={filters.category_id}
              onValueChange={(value) => updateFilter('category_id', value)}
              placeholder="All Categories"
              label="Category"
            />

            {/* Warehouse Filter */}
            {showWarehouse && (
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select
                  value={filters.warehouse_id}
                  onValueChange={(value) => updateFilter('warehouse_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Warehouses</SelectItem>
                    {warehouses?.filter(wh => wh.is_active).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stock Status Filter */}
            {showStockStatus && (
              <div className="space-y-2">
                <Label>Stock Status</Label>
                <Select
                  value={filters.stock_status}
                  onValueChange={(value) => updateFilter('stock_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Stock Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Active Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.is_active}
                onValueChange={(value) => updateFilter('is_active', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Items</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unit of Measure Filter */}
            {showUnitFilter && (
              <div className="space-y-2">
                <Label>Unit of Measure</Label>
                <Select
                  value={filters.unit_of_measure}
                  onValueChange={(value) => updateFilter('unit_of_measure', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Units" />
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
            )}
          </div>
        )}

        {/* Active filters display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.category_id && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Category</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('category_id', '')}
                />
              </Badge>
            )}
            {filters.warehouse_id && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Warehouse</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('warehouse_id', '')}
                />
              </Badge>
            )}
            {filters.stock_status && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Stock Status</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('stock_status', '')}
                />
              </Badge>
            )}
            {filters.is_active && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Status</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('is_active', '')}
                />
              </Badge>
            )}
            {filters.unit_of_measure && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Unit</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('unit_of_measure', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}