// src/app/(app)/warehousing/transfers/page.tsx
'use client'

import { Suspense } from 'react'
import { TableSkeleton } from '@/components/app/kit'
import { TransferList } from '@/components/warehousing/TransferList'

export default function TransfersPage() {
  // TransferList reads ?status= from the URL
  return (
    <Suspense fallback={<TableSkeleton />}>
      <TransferList />
    </Suspense>
  )
}
