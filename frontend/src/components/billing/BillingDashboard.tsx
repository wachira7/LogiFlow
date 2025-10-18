// src/components/billing/BillingDashboard.tsx
'use client';

import { useSubscriptionDashboard, useRevenueReport } from '@/hooks/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CreditCard, TrendingUp, Calendar, DollarSign, Users, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from 'recharts';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export function BillingDashboard() {
  const { dashboard, loading: dashLoading, error: dashError } = useSubscriptionDashboard();
  const { report, loading: reportLoading, error: reportError } = useRevenueReport();

  if (dashLoading || reportLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dashError || reportError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {dashError || reportError}
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate subscription health percentage
  const subscriptionHealth = dashboard.total_subscriptions > 0
    ? Math.round((dashboard.active_subscriptions / dashboard.total_subscriptions) * 100)
    : 0;

  // Provider revenue data for chart
  const providerData = [
    { name: 'Stripe', revenue: report.provider_revenue.stripe, fill: '#635BFF' },
    { name: 'M-Pesa', revenue: report.provider_revenue.mpesa, fill: '#00A859' },
    { name: 'Crypto', revenue: report.provider_revenue.crypto, fill: '#F7931A' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your subscriptions, payments, and billing history
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/billing/plans">
              <CreditCard className="h-4 w-4 mr-2" />
              View Plans
            </Link>
          </Button>
        </div>
      </div>

      {/* Subscription Status Alert */}
      {dashboard.trial_subscriptions > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have {dashboard.trial_subscriptions} trial subscription(s). 
            <Link href="/billing/subscriptions" className="ml-2 underline font-medium">
              Manage subscriptions
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.total_revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${dashboard.monthly_revenue.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.active_subscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.total_subscriptions} total subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionHealth}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.cancelled_subscriptions} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.next_billing_date 
                ? formatDistanceToNow(new Date(dashboard.next_billing_date), { addSuffix: true })
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Upcoming charge
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={report.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Provider Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Provider</CardTitle>
            <CardDescription>Total revenue breakdown by provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status Overview</CardTitle>
          <CardDescription>Breakdown of all subscription statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{dashboard.total_subscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{dashboard.active_subscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trial</p>
                <p className="text-2xl font-bold">{dashboard.trial_subscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold">{dashboard.cancelled_subscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <AlertTriangle className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{dashboard.expired_subscriptions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common billing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/billing/plans">
                <CreditCard className="h-6 w-6" />
                <span>View Plans</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/billing/subscriptions">
                <Users className="h-6 w-6" />
                <span>Manage Subscriptions</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/billing/payment-methods">
                <CreditCard className="h-6 w-6" />
                <span>Payment Methods</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/billing/transactions">
                <DollarSign className="h-6 w-6" />
                <span>Transaction History</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}