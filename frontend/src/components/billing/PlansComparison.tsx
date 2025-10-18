// src/components/billing/PlansComparison.tsx
'use client';

import { useState } from 'react';
import { useSubscriptionPlans } from '@/hooks/useBilling';
import { PlanCard } from './PlanCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import type { BillingCycle } from '@/types/billing.types';

interface PlansComparisonProps {
  onSelectPlan: (planId: string) => void;
  currentPlanId?: string;
  loading?: boolean;
}

export function PlansComparison({ onSelectPlan, currentPlanId, loading: actionLoading = false }: PlansComparisonProps) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');
  const { plans, loading, error } = useSubscriptionPlans({ billing_cycle: selectedCycle, is_active: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No subscription plans available at this time.
        </AlertDescription>
      </Alert>
    );
  }

  // Determine which plan is most popular (you can customize this logic)
  const getPopularPlanIndex = () => {
    // Find "Professional" plan or middle plan
    const proIndex = plans.findIndex(p => 
      p.name.toLowerCase().includes('pro') || 
      p.name.toLowerCase().includes('professional')
    );
    if (proIndex !== -1) return proIndex;
    
    // Otherwise return middle plan
    return Math.floor(plans.length / 2);
  };

  const popularIndex = getPopularPlanIndex();

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selector */}
      <div className="flex justify-center">
        <Tabs 
          value={selectedCycle} 
          onValueChange={(value) => setSelectedCycle(value as BillingCycle)} 
          className="w-auto"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="MONTHLY">Monthly</TabsTrigger>
            <TabsTrigger value="QUARTERLY">
              Quarterly
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                Save 10%
              </span>
            </TabsTrigger>
            <TabsTrigger value="ANNUAL">
              Annual
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                Save 20%
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={index === popularIndex}
            currentPlan={plan.id === currentPlanId}
            onSelect={onSelectPlan}
            loading={actionLoading}
          />
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-muted-foreground mt-8 space-y-2">
        <p>All plans include a 14-day free trial. No credit card required.</p>
        <p>Need a custom plan? <a href="/contact" className="underline font-medium hover:text-primary">Contact us</a></p>
      </div>
    </div>
  );
}