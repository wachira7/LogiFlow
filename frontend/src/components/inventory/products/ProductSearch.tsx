// src/components/inventory/products/ProductSearch.tsx
'use client'

import { useState, useEffect } from 'react'
import { useProducts } from '@/hooks/useInventory'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Search, X, Package2 } from 'lucide-react'
import Link from 'next/link'
import { Product } from '@/types/inventory.types'

interface ProductSearchProps {
  onProductSelect?: (product: Product) => void
  placeholder?: string
  showResults?: boolean
  className?: string
}

export function ProductSearch({ 
  onProductSelect, 
  placeholder = "Search products...", 
  showResults = true,
  className 
}: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const { products, isLoading } = useProducts()

  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setIsSearching(true)
      
      // Filter products based on search query
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 1000) // Limit to 1000 results

      setSearchResults(filtered)
      setShowDropdown(true)
      setIsSearching(false)
    }

    const debounceTimer = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, products])

  const handleProductSelect = (product: Product) => {
    if (onProductSelect) {
      onProductSelect(product)
    }
    setSearchQuery('')
    setShowDropdown(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && showDropdown && searchQuery && (
        <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Package2 className="h-4 w-4 mr-2" />
                No products found
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium truncate">{product.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {product.sku}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {product.category?.name || 'Uncategorized'}
                        </span>
                        <span className="text-xs">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(product.unit_price)}
                        </span>
                        {product.total_stock !== undefined && (
                          <>
                            <span className="text-xs">•</span>
                            <span className="text-xs text-muted-foreground">
                              Stock: {product.total_stock}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {!product.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                ))}
                
                {/* View All Results Link */}
                <div className="border-t pt-2 mt-2">
                  <Link href={`/inventory/products?search=${encodeURIComponent(searchQuery)}`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      View all results for &quot;{searchQuery}&quot;
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}