// src/app/distribution/shipments/new/page.tsx
'use client';
import { Suspense } from 'react';
import { ShipmentForm } from '@/components/distribution/ShipmentForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

function NewShipmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || undefined;

  const handleBack = () => {
    router.push('/distribution/shipments');
  };

  const handleSuccess = () => {
    router.push('/distribution/shipments');
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
            <h1 className="text-3xl font-bold tracking-tight">Create New Shipment</h1>
            <p className="text-muted-foreground">
              Create a shipment for order fulfillment and tracking
              {orderId && ' (from selected order)'}
            </p>
          </div>
        </div>
      </div>
      {orderId && <p className="text-muted-foreground">Order ID: {orderId}</p>}
      <ShipmentForm 
        orderId={orderId}
        onSuccess={handleSuccess} 
        onCancel={handleBack} 
      />
    </div>
  );
}

export default function NewShipmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewShipmentContent />
    </Suspense>
  );
}