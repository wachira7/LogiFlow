// src/app/inventory/inventory-items/[id]/edit/page.tsx
// "Adjust stock" for one stock line (linked from the inventory list and the item page).
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StockAdjustment } from '@/components/inventory/inventory-items/StockAdjustment'
import { inventoryService } from '@/services/inventoryService'
import type { InventoryItem } from '@/types/inventory.types'

export default function AdjustStockPage() {
  const itemId = useParams()?.id as string
  const router = useRouter()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    inventoryService.getInventoryItem(itemId).then((res) => {
      if (res.success && res.data) setItem(res.data)
      else setError(res.error || 'Stock line not found')
    })
  }, [itemId])

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/inventory/inventory-items"><Button>Back to inventory</Button></Link>
      </div>
    )
  }
  if (!item) return <div className="flex h-64 items-center justify-center"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/inventory/inventory-items/${item.id}`}>
          <Button variant="ghost" size="icon" aria-label="Back to stock line"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adjust stock</h1>
          <p className="text-muted-foreground">{item.product_name} at {item.warehouse_name} · {item.quantity} on hand</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <StockAdjustment
          productId={item.product_id}
          warehouseId={item.warehouse_id}
          item={item}
          onSuccess={() => router.push(`/inventory/inventory-items/${item.id}`)}
          onCancel={() => router.push(`/inventory/inventory-items/${item.id}`)}
        />
      </div>
    </div>
  )
}
