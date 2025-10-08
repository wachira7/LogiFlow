// src/app/warehousing/transfers/[id]/edit/page.tsx
'use client'

import { TransferForm } from '@/components/warehousing/TransferForm'
import { use } from 'react'

export default function EditTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TransferForm transferId={id} isEdit />
}