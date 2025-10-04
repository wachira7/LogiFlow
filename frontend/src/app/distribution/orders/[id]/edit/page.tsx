// src/app/distribution/orders/[id]/edit/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { OrderForm } from '@/components/distribution/OrderForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const handleBack = () => {
    router.push(`/distribution/orders/${orderId}`);
  };

  const handleSuccess = () => {
    router.push(`/distribution/orders/${orderId}`);
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
            <h1 className="text-3xl font-bold tracking-tight">Edit Order</h1>
            <p className="text-muted-foreground">
              Update order information and items
            </p>
          </div>
        </div>
      </div>

      {/* Order Edit Form */}
      <OrderForm 
        orderId={orderId}
        onSuccess={handleSuccess} 
        onCancel={handleBack} 
      />
    </div>
  );
}