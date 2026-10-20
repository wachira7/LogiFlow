// src/components/warehousing/status.tsx
// One place for how transfer statuses look and read.
import { StatusPill, type Tone } from '@/components/app/kit'
import type { TransferStatus, WarehouseTransfer } from '@/types/warehousing.types'

export const TRANSFER_STATUS: Record<TransferStatus, { label: string; tone: Tone; hint: string }> = {
  PENDING: { label: 'Pending', tone: 'warning', hint: 'Waiting for approval' },
  IN_TRANSIT: { label: 'In transit', tone: 'info', hint: 'Stock is on the road' },
  COMPLETED: { label: 'Completed', tone: 'success', hint: 'Received at the destination' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', hint: 'No stock moved, or it was returned' },
}

export function TransferStatusPill({ transfer }: { transfer: Pick<WarehouseTransfer, 'status' | 'stock_dispatched'> }) {
  const s = TRANSFER_STATUS[transfer.status] ?? TRANSFER_STATUS.PENDING
  // Transfers approved under the old flow are in transit on paper, but their stock hasn't left yet
  const label = transfer.status === 'IN_TRANSIT' && transfer.stock_dispatched === false ? 'Approved · not started' : s.label
  return <StatusPill tone={s.tone} pulse={transfer.status === 'IN_TRANSIT'}>{label}</StatusPill>
}
