// src/app/(app)/inventory/warehouses/[id]/edit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { WarehouseForm } from '@/components/inventory/WarehouseForm'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <WarehouseForm warehouseId={id} />
}
