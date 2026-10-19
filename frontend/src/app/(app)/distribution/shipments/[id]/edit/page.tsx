// src/app/distribution/shipments/[id]/edit/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ShipmentForm } from '@/components/distribution/ShipmentForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const handleBack = () => {
    router.push(`/distribution/shipments/${shipmentId}`);
  };

  const handleSuccess = () => {
    router.push(`/distribution/shipments/${shipmentId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Shipment</h1>
            <p className="text-muted-foreground">
              Update shipment details and tracking information
            </p>
          </div>
        </div>
      </div>

      {/* Shipment Edit Form */}
      <ShipmentForm 
        shipmentId={shipmentId}
        onSuccess={handleSuccess} 
        onCancel={handleBack} 
      />
    </div>
  );
}