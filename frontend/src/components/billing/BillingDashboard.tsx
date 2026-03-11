// src/components/billing/BillingDashboard.tsx
'use client';

import { useSubscriptions, useSubscriptionDashboard, useTransactions } from '@/hooks/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  CreditCard, Package, Users, Warehouse, Box,
  Calendar, ArrowRight, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Receipt, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { UserSubscription } from '@/types/billing.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadge(status: UserSubscription['status']) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ACTIVE:   { label: 'Active',   variant: 'default' },
    TRIALING: { label: 'Trial',    variant: 'secondary' },
    PAST_DUE: { label: 'Past Due', variant: 'destructive' },
    CANCELLED:{ label: 'Cancelled',variant: 'outline' },
    EXPIRED:  { label: 'Expired',  variant: 'destructive' },
    UNPAID:   { label: 'Unpaid',   variant: 'destructive' },
  };
  const cfg = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function getProviderBadge(provider: string) {
  const map: Record<string, string> = {
    STRIPE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    MPESA:  'bg-green-100  text-green-700  dark:bg-green-900  dark:text-green-300',
    CRYPTO: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[provider] ?? ''}`}>
      {provider}
    </span>
  );
}

function UsageBar({ label, used, max, icon }: {
  label: string; used: number; max: number; icon: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-medium">{used} / {max}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 90 && (
        <p className="text-xs text-red-500">
          Almost at limit — consider upgrading
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BillingDashboard() {
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { dashboard, loading: dashLoading } = useSubscriptionDashboard();
  const { transactions, loading: txLoading } = useTransactions();

  // Active or trialing subscription
  const activeSubscription = useMemo(
    () => subscriptions.find(s => s.status === 'ACTIVE' || s.status === 'TRIALING') ?? null,
    [subscriptions]
  );

  // Last 5 transactions
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Total spent (completed transactions)
  const totalSpent = useMemo(
    () => transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    [transactions]
  );

  // This month spent
  const thisMonthSpent = useMemo(() => {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    return transactions
      .filter(t => t.status === 'COMPLETED' && new Date(t.created_at) >= start)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  }, [transactions]);

  const loading = subsLoading || dashLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your subscription, payments, and billing history
          </p>
        </div>
        <Button asChild>
          <Link href="/billing/plans">
            <Package className="h-4 w-4 mr-2" />
            View Plans
          </Link>
        </Button>
      </div>

      {/* ── Trial / Expiry Alerts ── */}
      {activeSubscription?.status === 'TRIALING' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Free trial active</strong> — {activeSubscription.days_remaining} day
            {activeSubscription.days_remaining !== 1 ? 's' : ''} remaining.{' '}
            <Link href="/billing/plans" className="underline font-medium">
              Upgrade now
            </Link>{' '}
            to avoid interruption.
          </AlertDescription>
        </Alert>
      )}

      {activeSubscription?.status === 'PAST_DUE' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment overdue.</strong> Your subscription is at risk of cancellation.{' '}
            <Link href="/billing/payment-methods" className="underline font-medium">
              Update payment method
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!activeSubscription && !loading && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have an active subscription.{' '}
            <Link href="/billing/plans" className="underline font-medium">
              Browse plans
            </Link>{' '}
            to get started with a 14-day free trial.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Top Cards Row ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Current Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Plan
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSubscription ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{activeSubscription.plan_name}</p>
                  {getStatusBadge(activeSubscription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  ${activeSubscription.plan_price} /{' '}
                  {activeSubscription.payment_provider === 'MPESA' ? 'month (KES)' : 'month'}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                  <Calendar className="h-3 w-3" />
                  {activeSubscription.days_remaining > 0
                    ? `${activeSubscription.days_remaining} days remaining`
                    : 'Expired'}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-muted-foreground">No Plan</p>
                <Button size="sm" asChild>
                  <Link href="/billing/plans">Get Started</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Spent
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              ${thisMonthSpent.toFixed(2)} this month
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Receipt className="h-3 w-3" />
              {transactions.filter(t => t.status === 'COMPLETED').length} completed payments
            </div>
          </CardContent>
        </Card>

        {/* Next Billing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Billing
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSubscription && !activeSubscription.is_expired ? (
              <>
                <p className="text-2xl font-bold">
                  {new Date(activeSubscription.end_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeSubscription.auto_renew
                    ? `$${activeSubscription.plan_price} will be charged`
                    : 'Auto-renew is off'}
                </p>
                <div className="flex items-center gap-1 text-xs pt-1">
                  {activeSubscription.auto_renew
                    ? <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600">Auto-renew on</span></>
                    : <><AlertTriangle className="h-3 w-3 text-yellow-500" /><span className="text-yellow-600">Auto-renew off</span></>
                  }
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Usage Limits ── */}
      {activeSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Usage</CardTitle>
            <CardDescription>
              Your current usage against {activeSubscription.plan_name} plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 
              These values come from the plan limits on the subscription.
              Real usage counts would need dedicated API endpoints per module.
              For now we show the limits clearly so the tenant knows their ceiling.
            */}
            <UsageBar
              label="Team Members"
              used={dashboard.active_subscriptions > 0 ? 1 : 0}
              max={50} // TODO: replace with real plan.max_users from subscription detail
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <UsageBar
              label="Warehouses"
              used={0}
              max={10} // TODO: replace with real plan.max_warehouses
              icon={<Warehouse className="h-3.5 w-3.5" />}
            />
            <UsageBar
              label="Products"
              used={0}
              max={1000} // TODO: replace with real plan.max_products
              icon={<Box className="h-3.5 w-3.5" />}
            />
            <p className="text-xs text-muted-foreground">
              * Real-time usage tracking coming soon. Limits are based on your current plan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Transactions ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest billing activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing/transactions">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {tx.description || 'Payment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getProviderBadge(tx.provider)}
                    <Badge
                      variant={
                        tx.status === 'COMPLETED' ? 'default' :
                        tx.status === 'FAILED' ? 'destructive' :
                        tx.status === 'REFUNDED' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                    <span className="font-semibold text-sm min-w-[60px] text-right">
                      {tx.currency} {parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ── */}
      <div className="grid gap-3 md:grid-cols-3">
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" asChild>
          <Link href="/billing/plans">
            <Package className="h-5 w-5" />
            <span className="font-medium">Upgrade Plan</span>
            <span className="text-xs text-muted-foreground">Increase your limits</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" asChild>
          <Link href="/billing/payment-methods">
            <CreditCard className="h-5 w-5" />
            <span className="font-medium">Payment Methods</span>
            <span className="text-xs text-muted-foreground">Manage cards & wallets</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" asChild>
          <Link href="/billing/transactions">
            <Receipt className="h-5 w-5" />
            <span className="font-medium">All Invoices</span>
            <span className="text-xs text-muted-foreground">Download receipts</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}