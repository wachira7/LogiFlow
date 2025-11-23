// src/components/billing/SubscriptionSummaryCard.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Crown,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import type { UserSubscription } from '@/types/billing.types';
import { format } from 'date-fns';

interface SubscriptionSummaryCardProps {
  subscription: UserSubscription;
  showActions?: boolean;
}

export function SubscriptionSummaryCard({ subscription, showActions = true }: SubscriptionSummaryCardProps) {
  // Calculate progress percentage
  const progressPercentage = subscription.days_remaining > 0
    ? Math.min(100, (subscription.days_remaining / 30) * 100)
    : 0;

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'TRIALING':
        return 'bg-blue-500';
      case 'PAST_DUE':
        return 'bg-yellow-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'EXPIRED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'TRIALING':
        return <Zap className="h-4 w-4" />;
      case 'PAST_DUE':
        return <AlertCircle className="h-4 w-4" />;
      case 'CANCELLED':
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Premium indicator for active subscriptions */}
      {subscription.status === 'ACTIVE' && (
        <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-linear-to-br from-yellow-400 to-orange-500 rounded-full opacity-10" />
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {subscription.status === 'ACTIVE' && <Crown className="h-5 w-5 text-yellow-600" />}
              {subscription.plan_name}
            </CardTitle>
            <CardDescription>{subscription.company_name}</CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(subscription.status)} text-white border-0`}
          >
            <span className="flex items-center gap-1">
              {getStatusIcon(subscription.status)}
              {subscription.status}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">${subscription.plan_price}</span>
          <span className="text-muted-foreground">
            {subscription.is_trial ? '(Trial)' : `per ${subscription.plan_name.toLowerCase().includes('annual') ? 'year' : 'month'}`}
          </span>
        </div>

        {/* Payment Provider */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Payment via {subscription.payment_provider}</span>
        </div>

        {/* Billing Period */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Billing Period</span>
            <span className="font-medium">
              {format(new Date(subscription.start_date), 'MMM dd, yyyy')} - {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
            </span>
          </div>

          {/* Days remaining progress */}
          {!subscription.is_expired && (
            <>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {subscription.days_remaining} days remaining
                </span>
                {subscription.auto_renew && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Auto-renews
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Trial indicator */}
        {subscription.is_trial && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              🎉 You&apos;re on a trial period
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Enjoy all premium features until your trial ends
            </p>
          </div>
        )}

        {/* Expired/Cancelled warning */}
        {(subscription.is_expired || subscription.status === 'CANCELLED') && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm">
            <p className="font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {subscription.is_expired ? 'Subscription Expired' : 'Subscription Cancelled'}
            </p>
            <p className="text-red-700 dark:text-red-300 mt-1">
              {subscription.is_expired 
                ? 'Renew your subscription to continue using premium features'
                : 'Your subscription has been cancelled'
              }
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/billing/subscriptions/${subscription.id}`}>
                View Details
              </Link>
            </Button>
            {subscription.status === 'ACTIVE' && (
              <Button asChild variant="default" className="flex-1">
                <Link href="/billing/plans">
                  Upgrade Plan
                </Link>
              </Button>
            )}
            {(subscription.is_expired || subscription.status === 'CANCELLED') && (
              <Button asChild variant="default" className="flex-1">
                <Link href="/billing/plans">
                  Renew Now
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
