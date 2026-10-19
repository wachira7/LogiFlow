// src/app/distribution/shipments/page.tsx
'use client';
import { ShipmentList } from '@/components/distribution/ShipmentList';
export default function ShipmentsPage() {
  return (
  <div className="container mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipments Management</h1>
        <p className="text-muted-foreground">
          Track and manage shipment fulfillment from pick to delivery
        </p>
      </div>
    </div>
    <ShipmentList />
  </div>
);
}
