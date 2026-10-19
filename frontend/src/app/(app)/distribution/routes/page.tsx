// src/app/distribution/routes/page.tsx
'use client';

import { RouteList } from '@/components/distribution/RouteList';

export default function RoutesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routes Management</h1>
          <p className="text-muted-foreground">
            Plan and manage delivery routes for efficient distribution
          </p>
        </div>
      </div>

      {/* Main Routes Component */}
      <RouteList />
    </div>
  );
}
