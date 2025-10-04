
// src/app/distribution/orders/new/page.tsx
'use client';

import { OrderForm } from '@/components/distribution/OrderForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/distribution/orders');
  };

  const handleSuccess = () => {
    router.push('/distribution/orders');
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
            <h1 className="text-3xl font-bold tracking-tight">Create New Order</h1>
            <p className="text-muted-foreground">
              Add customer information and order items to create a new order
            </p>
          </div>
        </div>
      </div>

      {/* Order Creation Form */}
      <OrderForm onSuccess={handleSuccess} onCancel={handleBack} />
    </div>
  );
}