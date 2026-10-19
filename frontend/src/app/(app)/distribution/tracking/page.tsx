// src/app/distribution/tracking/page.tsx
'use client';

import { TrackingDashboard } from '@/components/distribution/TrackingDashboard';

export default function TrackingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distribution Tracking</h1>
          <p className="text-muted-foreground">
            Monitor and track orders, shipments, and routes across your distribution network
          </p>
        </div>
      </div>

      {/* Main Tracking Component */}
      <TrackingDashboard />
    </div>
  );
}