// src/app/distribution/routes/[id]/edit/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { RouteForm } from '@/components/distribution/RouteForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditRoutePage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const handleBack = () => {
    router.push(`/distribution/routes/${routeId}`);
  };

  const handleSuccess = () => {
    router.push(`/distribution/routes/${routeId}`);
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
            <h1 className="text-3xl font-bold tracking-tight">Edit Route</h1>
            <p className="text-muted-foreground">
              Update route details, stops, and assignments
            </p>
          </div>
        </div>
      </div>

      {/* Route Edit Form */}
      <RouteForm 
        routeId={routeId}
        onSuccess={handleSuccess} 
        onCancel={handleBack} 
      />
    </div>
  );
}