// src/app/billing/plans/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { PlansComparison } from '@/components/billing/PlansComparison';
import { SubscribeDialog } from '@/components/billing/SubscribeDialog';
import { useSubscriptions } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlansPage() {
  // ✅ FIX: Use useMemo to prevent object recreation on every render
  const filters = useMemo(() => ({ status: 'ACTIVE' as const }), []);
  const { subscriptions } = useSubscriptions(filters);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Get current active subscription plan ID
  const currentPlanId = subscriptions.find(s => s.status === 'ACTIVE')?.id;

  // Handle plan selection
  const handleSelectPlan = (planId: string) => {
    setActionLoading(true);
    setSelectedPlanId(planId);
    setSubscribeDialogOpen(true);
    // Reset loading after dialog opens
    setTimeout(() => setActionLoading(false), 300);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/billing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Choose the perfect plan for your business needs
          </p>
        </div>
      </div>

      {/* Plans Comparison */}
      <PlansComparison
        onSelectPlan={handleSelectPlan}
        currentPlanId={currentPlanId}
        loading={actionLoading}
      />

      {/* Subscribe Dialog */}
      <SubscribeDialog
        open={subscribeDialogOpen}
        onOpenChange={setSubscribeDialogOpen}
        planId={selectedPlanId}
      />
    </div>
  );
}