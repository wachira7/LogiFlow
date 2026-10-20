// src/app/warehousing/transfers/[id]/page.tsx
'use client'

import { TransferDetail } from '@/components/warehousing/TransferDetail'
import { use } from 'react'

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TransferDetail transferId={id} />
}