// src/app/distribution/orders/page.tsx
'use client';

import { OrderList } from '@/components/distribution/OrderList';

export default function OrdersPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage customer orders, track fulfillment, and monitor order status
          </p>
        </div>
      </div>

      {/* Main Orders Component */}
      <OrderList />
    </div>
  );
}
