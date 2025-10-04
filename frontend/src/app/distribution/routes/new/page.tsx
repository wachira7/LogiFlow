
// src/app/distribution/routes/new/page.tsx
'use client';

import { RouteForm } from '@/components/distribution/RouteForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewRoutePage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/distribution/routes');
  };

  const handleSuccess = () => {
    router.push('/distribution/routes');
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
            <h1 className="text-3xl font-bold tracking-tight">Create New Route</h1>
            <p className="text-muted-foreground">
              Plan a new delivery route with stops and assignments
            </p>
          </div>
        </div>
      </div>

      {/* Route Creation Form */}
      <RouteForm 
        onSuccess={handleSuccess} 
        onCancel={handleBack} 
      />
    </div>
  );
}