// src/components/billing/SubscriptionDetail.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useSubscriptions } from '@/hooks/useBilling';
import {
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Crown,
  Users,
  Building2,
  Package,
  ArrowLeft
} from 'lucide-react';
import type { UserSubscriptionDetail } from '@/types/billing.types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SubscriptionDetailProps {
  subscription: UserSubscriptionDetail;
}

export function SubscriptionDetail({ subscription }: SubscriptionDetailProps) {
  const router = useRouter();
  const { cancelSubscription, reactivateSubscription } = useSubscriptions();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate progress
  const progressPercentage = subscription.days_remaining > 0
    ? Math.min(100, (subscription.days_remaining / 30) * 100)
    : 0;

  // Handle cancel
  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelSubscription(subscription.id);
      if (result.success) {
        toast.success('Subscription cancelled', {
          description: result?.data?.message
        });
        setCancelDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to cancel subscription');
      }
    } catch  {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    setLoading(true);
    try {
      const result = await reactivateSubscription(subscription.id);
      if (result.success) {
        toast.success('Subscription reactivated', {
          description: result?.data?.message
        });
        setReactivateDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to reactivate subscription');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get status color
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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/billing/subscriptions">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {subscription.status === 'ACTIVE' && <Crown className="h-8 w-8 text-yellow-600" />}
            {subscription.plan.name}
          </h2>
          <p className="text-muted-foreground mt-1">
            Subscription for {subscription.company_name}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`${getStatusColor(subscription.status)} text-white border-0 text-lg px-4 py-2`}
        >
          {subscription.status}
        </Badge>
      </div>

      {/* Status Alerts */}
      {subscription.is_trial && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Trial Period Active</strong>
            <p className="mt-1">
              Your trial ends on {format(new Date(subscription.trial_end || subscription.end_date), 'MMM dd, yyyy')}. 
              You won&apos;t be charged until then.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {subscription.status === 'CANCELLED' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Subscription Cancelled</strong>
            <p className="mt-1">Your subscription has been cancelled and will end on {format(new Date(subscription.end_date), 'MMM dd, yyyy')}.</p>
          </AlertDescription>
        </Alert>
      )}

      {subscription.is_expired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Subscription Expired</strong>
            <p className="mt-1">Your subscription expired on {format(new Date(subscription.end_date), 'MMM dd, yyyy')}. Renew now to continue using premium features.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>Your current subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">${subscription.plan_price}</span>
              <span className="text-muted-foreground">
                per {subscription.plan.billing_cycle.toLowerCase().replace('ly', '')}
              </span>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Max Users
                </span>
                <span className="font-medium">{subscription.plan.max_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Max Warehouses
                </span>
                <span className="font-medium">{subscription.plan.max_warehouses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Max Products
                </span>
                <span className="font-medium">{subscription.plan.max_products.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Features:</p>
              <ul className="space-y-1">
                {Object.entries(subscription.plan.features).map(([key, value]) => {
                  if (value === false) return null;
                  const featureName = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                  return (
                    <li key={key} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {typeof value === 'string' ? value : featureName}
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Billing Details */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
            <CardDescription>Payment and billing information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </span>
                <span className="font-medium">{subscription.payment_provider}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </span>
                <span className="font-medium">
                  {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </span>
                <span className="font-medium">
                  {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {subscription.trial_end && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Trial Ends
                  </span>
                  <span className="font-medium">
                    {format(new Date(subscription.trial_end), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Days Remaining */}
            {!subscription.is_expired && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Days Remaining</span>
                  <span className="font-medium">{subscription.days_remaining} days</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-Renew
              </span>
              <span className="font-medium">
                {subscription.auto_renew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {subscription.recent_transactions && subscription.recent_transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest payment transactions for this subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscription.recent_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${parseFloat(transaction.amount).toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/billing/transactions">
                  View All Transactions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Actions</CardTitle>
          <CardDescription>Manage your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {subscription.status === 'ACTIVE' && (
              <>
                <Button asChild>
                  <Link href="/billing/plans">
                    Upgrade Plan
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              </>
            )}

            {subscription.status === 'CANCELLED' && !subscription.is_expired && (
              <Button
                onClick={() => setReactivateDialogOpen(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reactivate Subscription
              </Button>
            )}

            {subscription.is_expired && (
              <Button asChild>
                <Link href="/billing/plans">
                  Renew Subscription
                </Link>
              </Button>
            )}

            <Button variant="outline" asChild>
              <Link href="/billing/payment-methods">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Payment Methods
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        description="Are you sure you want to cancel this subscription? You may be eligible for a prorated refund."
        confirmText="Cancel Subscription"
        loading={loading}
      />

      <ConfirmDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        onConfirm={handleReactivate}
        title="Reactivate Subscription"
        description="Do you want to reactivate this subscription? Your payment method will be charged immediately."
        confirmText="Reactivate"
        loading={loading}
      />
    </div>
  );
}