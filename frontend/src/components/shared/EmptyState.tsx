// src/components/shared/EmptyState.tsx

import { ReactNode } from 'react'
import { Package, FileX, Search } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon,
  className = "" 
}: EmptyStateProps) {
  // Default icon based on context
  const defaultIcon = icon || <Package className="h-12 w-12 text-muted-foreground/50" />

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4">
        {defaultIcon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
}

// Predefined variants for common use cases
export function EmptyProducts({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No products found"
      description="Get started by adding your first product to your inventory"
      action={action}
      icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
    />
  )
}

export function EmptyCategories({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No categories found"
      description="Create categories to organize your products better"
      action={action}
      icon={<FileX className="h-12 w-12 text-muted-foreground/50" />}
    />
  )
}

export function EmptyWarehouses({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No warehouses found"
      description="Add warehouses to manage your inventory locations"
      action={action}
      icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
    />
  )
}

export function EmptyTransactions({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No transactions found"
      description="Inventory transactions will appear here as you manage stock"
      action={action}
      icon={<FileX className="h-12 w-12 text-muted-foreground/50" />}
    />
  )
}

export function EmptySearch({ 
  searchTerm, 
  onClear 
}: { 
  searchTerm: string
  onClear?: () => void 
}) {
  return (
    <EmptyState
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search or filters.`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear search
          </button>
        )
      }
      icon={<Search className="h-12 w-12 text-muted-foreground/50" />}
    />
  )
}