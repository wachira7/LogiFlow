// src/app/(app)/distribution/shipments/[id]/edit/page.tsx
'use client'

import { use } from 'react'
import { ShipmentForm } from '@/components/distribution/ShipmentForm'

export default function EditShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ShipmentForm shipmentId={id} />
}
