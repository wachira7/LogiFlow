// /src/components/inventory/inventory-items/StockLevelIndicator.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockLevelIndicatorProps {
  currentStock: number
  minimumStock?: number | null
  maximumStock?: number | null
  reorderPoint?: number | null
  variant?: 'badge' | 'progress' | 'detailed'
  className?: string
  showNumbers?: boolean
}

export function StockLevelIndicator({
  currentStock,
  minimumStock,
  maximumStock,
  reorderPoint,
  variant = 'badge',
  className,
  showNumbers = true
}: StockLevelIndicatorProps) {
  
  // Determine stock status
  const getStockStatus = () => {
    if (currentStock === 0) return 'out_of_stock'
    if (reorderPoint && currentStock <= reorderPoint) return 'low_stock'
    if (minimumStock && currentStock <= minimumStock) return 'below_minimum'
    if (maximumStock && currentStock >= maximumStock) return 'overstocked'
    return 'normal'
  }

  const status = getStockStatus()

  const statusConfig = {
    out_of_stock: {
      label: 'Out of Stock',
      variant: 'destructive' as const,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    low_stock: {
      label: 'Low Stock',
      variant: 'destructive' as const,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    below_minimum: {
      label: 'Below Minimum',
      variant: 'secondary' as const,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    overstocked: {
      label: 'Overstocked',
      variant: 'secondary' as const,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    normal: {
      label: 'In Stock',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  // Calculate progress percentage for progress variant
  const getProgressValue = () => {
    if (!maximumStock) return 50 // Default if no max stock
    return Math.min((currentStock / maximumStock) * 100, 100)
  }

  if (variant === 'badge') {
    return (
      <Badge variant={config.variant} className={cn("flex items-center space-x-1", className)}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
        {showNumbers && <span>({currentStock})</span>}
      </Badge>
    )
  }

  if (variant === 'progress') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="font-medium">{config.label}</span>
          </div>
          {showNumbers && (
            <span className="text-muted-foreground">
              {currentStock}{maximumStock && ` / ${maximumStock}`}
            </span>
          )}
        </div>
        <Progress 
          value={getProgressValue()} 
          className="h-2"
        />
      </div>
    )
  }

  // Detailed variant
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2">
        <Icon className={cn("h-5 w-5", config.color)} />
        <span className="font-medium">{config.label}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Current Stock:</span>
          <div className="font-medium">{currentStock}</div>
        </div>
        
        {minimumStock && (
          <div>
            <span className="text-muted-foreground">Minimum:</span>
            <div className="font-medium">{minimumStock}</div>
          </div>
        )}
        
        {reorderPoint && (
          <div>
            <span className="text-muted-foreground">Reorder Point:</span>
            <div className="font-medium">{reorderPoint}</div>
          </div>
        )}
        
        {maximumStock && (
          <div>
            <span className="text-muted-foreground">Maximum:</span>
            <div className="font-medium">{maximumStock}</div>
          </div>
        )}
      </div>

      {maximumStock && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stock Level</span>
            <span>{Math.round(getProgressValue())}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>
      )}
    </div>
  )
}