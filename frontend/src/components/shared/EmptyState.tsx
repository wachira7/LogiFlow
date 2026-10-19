// src/components/shared/EmptyState.tsx
'use client'

import { ReactNode } from 'react'
import { Package, FileX, Search } from 'lucide-react'
import { FadeIn } from '@/components/app/motion'

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
  return (
    <FadeIn className={`flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-4 py-14 text-center ${className}`}>
      <div className="relative mb-5">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-brand/10 [animation-duration:2.4s] motion-reduce:hidden" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand ring-1 ring-brand/15 [&_svg]:h-7 [&_svg]:w-7 [&_svg]:text-brand">
          {icon || <Package />}
        </div>
      </div>
      <h3 className="mb-1.5 text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </FadeIn>
  )
}

// Predefined variants for common use cases
export function EmptyProducts({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No products found"
      description="Get started by adding your first product to your inventory"
      action={action}
      icon={<Package />}
    />
  )
}

export function EmptyCategories({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No categories found"
      description="Create categories to organize your products better"
      action={action}
      icon={<FileX />}
    />
  )
}

export function EmptyWarehouses({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No warehouses found"
      description="Add warehouses to manage your inventory locations"
      action={action}
      icon={<Package />}
    />
  )
}

export function EmptyTransactions({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No transactions found"
      description="Inventory transactions will appear here as you manage stock"
      action={action}
      icon={<FileX />}
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
            className="text-sm font-medium text-brand hover:underline"
          >
            Clear search
          </button>
        )
      }
      icon={<Search />}
    />
  )
}
