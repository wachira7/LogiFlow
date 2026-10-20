// src/app/(app)/inventory/inventory-items/[id]/edit/page.tsx
// Stock changes happen through adjustments, so "edit" opens the stock line with the adjust dialog.
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/inventory/inventory-items/${id}?adjust=1`)
}
