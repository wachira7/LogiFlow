// src/components/billing/PlanCard.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import type { SubscriptionPlan } from '@/types/billing.types';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  currentPlan?: boolean;
  onSelect: (planId: string) => void;
  loading?: boolean;
}

export function PlanCard({ plan, isPopular = false, currentPlan = false, onSelect, loading = false }: PlanCardProps) {
  
  // Get billing cycle text
  const getBillingCycleText = (cycle: string) => {
    switch (cycle) {
      case 'MONTHLY':
        return '/month';
      case 'QUARTERLY':
        return '/quarter';
      case 'ANNUAL':
        return '/year';
      default:
        return '';
    }
  };

  // Calculate monthly equivalent for non-monthly plans
  const getMonthlyEquivalent = () => {
    const price = parseFloat(plan.price);
    if (plan.billing_cycle === 'QUARTERLY') {
      return (price / 3).toFixed(2);
    } else if (plan.billing_cycle === 'ANNUAL') {
      return (price / 12).toFixed(2);
    }
    return price.toFixed(2);
  };

  // Calculate savings
  const getSavings = () => {
    const price = parseFloat(plan.price);
    if (plan.billing_cycle === 'QUARTERLY') {
      // 10% discount
      const monthlyPrice = price / 3;
      const regularPrice = monthlyPrice / 0.9;
      const savings = ((regularPrice * 3 - price) / (regularPrice * 3) * 100).toFixed(0);
      return `Save ${savings}%`;
    } else if (plan.billing_cycle === 'ANNUAL') {
      // 20% discount
      const monthlyPrice = price / 12;
      const regularPrice = monthlyPrice / 0.8;
      const savings = ((regularPrice * 12 - price) / (regularPrice * 12) * 100).toFixed(0);
      return `Save ${savings}%`;
    }
    return null;
  };

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''} ${currentPlan ? 'opacity-75' : ''}`}>
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {/* Current Plan Badge */}
      {currentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge variant="secondary">Current Plan</Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold">${plan.price}</span>
            <span className="text-muted-foreground text-sm">{getBillingCycleText(plan.billing_cycle)}</span>
          </div>
          {plan.billing_cycle !== 'MONTHLY' && (
            <p className="text-sm text-muted-foreground mt-2">
              ${getMonthlyEquivalent()}/month equivalent
            </p>
          )}
          {getSavings() && (
            <Badge variant="secondary" className="mt-2">
              {getSavings()}
            </Badge>
          )}
        </div>

        {/* Limits */}
        <div className="space-y-2 text-sm text-muted-foreground border-t border-b py-4">
          <div className="flex justify-between">
            <span>Users</span>
            <span className="font-medium text-foreground">
              {plan.max_users === 999999 ? 'Unlimited' : plan.max_users}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Warehouses</span>
            <span className="font-medium text-foreground">
              {plan.max_warehouses === 999999 ? 'Unlimited' : plan.max_warehouses}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Products</span>
            <span className="font-medium text-foreground">
              {plan.max_products === 999999 ? 'Unlimited' : plan.max_products.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <p className="font-medium text-sm">Features included:</p>
          <ul className="space-y-2">
            {Object.entries(plan.features).map(([key, value]) => {
              // Skip if value is false
              if (value === false) return null;
              
              // Format feature name
              const featureName = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              
              return (
                <li key={key} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {typeof value === 'string' ? value : featureName}
                  </span>
                </li>
              );
            })}
            {Object.keys(plan.features).length === 0 && (
              <li className="text-sm text-muted-foreground italic">
                No additional features listed
              </li>
            )}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => onSelect(plan.id)}
          disabled={!plan.is_active || currentPlan || loading}
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
        >
          {loading ? 'Processing...' : currentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}