// src/app/platform-admin/financial/page.tsx
'use client';

import { useEffect } from 'react'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DollarSign, TrendingUp, AlertTriangle, RefreshCw, CreditCard, Smartphone, Bitcoin, Users, Calendar, CheckCircle, XCircle, Clock, BarChart3, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FinancialAnalyticsPage() {
  const {
    analytics,
    companies,
    isLoadingAnalytics,
    isLoadingCompanies,
    analyticsError,
    fetchAnalytics,
    fetchCompanies,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchAnalytics()
    fetchCompanies()
  }, [fetchAnalytics, fetchCompanies])

  const loading = isLoadingAnalytics || isLoadingCompanies
  const error = analyticsError

  // Build the shape the rest of the page expects
  const revenueReport = {
    total_revenue: analytics?.total_revenue ?? 0,
    transaction_count: 0, // not available from platform analytics endpoint
    provider_revenue: { stripe: 0, mpesa: 0, crypto: 0 },
    monthly_revenue: analytics?.monthly_revenue ?? [],
  }

  const subscriptionsDashboard = {
    total_subscriptions: Object.values(analytics?.subscription_breakdown ?? {}).reduce((a, b) => a + b, 0),
    active_subscriptions: analytics?.subscription_breakdown?.active ?? 0,
    trial_subscriptions: analytics?.subscription_breakdown?.trialing ?? 0,
    cancelled_subscriptions: analytics?.subscription_breakdown?.canceled ?? 0,
    expired_subscriptions: analytics?.subscription_breakdown?.past_due ?? 0,
    monthly_revenue: analytics ? analytics.total_revenue / 12 : 0,
    total_revenue: analytics?.total_revenue ?? 0,
    next_billing_date: null as string | null,
  }

   const stripePercentage = 0
  const mpesaPercentage = 0
  const cryptoPercentage = 0

  const activeSubRate = subscriptionsDashboard.total_subscriptions > 0
    ? Math.round((subscriptionsDashboard.active_subscriptions / subscriptionsDashboard.total_subscriptions) * 100)
    : 0

  const churnRate = subscriptionsDashboard.total_subscriptions > 0
    ? Math.round((subscriptionsDashboard.cancelled_subscriptions / subscriptionsDashboard.total_subscriptions) * 100)
    : 0

  const highestRevenueMonth = revenueReport.monthly_revenue.reduce(
    (max, month) => month.revenue > max.revenue ? month : max,
    { month: '', revenue: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading financial data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={() => fetchAnalytics()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center space-x-4">
          <Link href="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Financial Analytics</h2>
            <p className="text-muted-foreground">
              Revenue, transactions, and subscription insights
            </p>
          </div>
        </div>
        <Button onClick={() => fetchAnalytics()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${revenueReport.total_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueReport.transaction_count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transactions
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subscriptionsDashboard.active_subscriptions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeSubRate}% of total
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${subscriptionsDashboard.monthly_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Subscriptions Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Provider Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Revenue by Payment Provider</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Revenue Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">${revenueReport.total_revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {revenueReport.transaction_count} transactions
              </p>
            </div>

            {/* Stripe */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Stripe</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ${revenueReport.provider_revenue.stripe.toLocaleString()} ({stripePercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${stripePercentage}%` }}
                />
              </div>
            </div>

            {/* M-Pesa */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">M-Pesa</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ${revenueReport.provider_revenue.mpesa.toLocaleString()} ({mpesaPercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${mpesaPercentage}%` }}
                />
              </div>
            </div>

            {/* Crypto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Bitcoin className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Crypto</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ${revenueReport.provider_revenue.crypto.toLocaleString()} ({cryptoPercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${cryptoPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Subscriptions Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Subscriptions */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-3xl font-bold">{subscriptionsDashboard.total_subscriptions}</p>
            </div>

            {/* Subscription Status Breakdown */}
            <div className="space-y-3">
              {/* Active */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">{activeSubRate}% of total</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {subscriptionsDashboard.active_subscriptions}
                </p>
              </div>

              {/* Trial */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Trial</p>
                    <p className="text-xs text-muted-foreground">Testing period</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {subscriptionsDashboard.trial_subscriptions}
                </p>
              </div>

              {/* Cancelled */}
              {subscriptionsDashboard.cancelled_subscriptions > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-destructive">
                  <div className="flex items-center space-x-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Cancelled</p>
                      <p className="text-xs text-muted-foreground">{churnRate}% churn rate</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    {subscriptionsDashboard.cancelled_subscriptions}
                  </p>
                </div>
              )}

              {/* Expired */}
              {subscriptionsDashboard.expired_subscriptions > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Expired</p>
                      <p className="text-xs text-muted-foreground">Need renewal</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">
                    {subscriptionsDashboard.expired_subscriptions}
                  </p>
                </div>
              )}
            </div>

            {/* Next Billing Date */}
            {subscriptionsDashboard.next_billing_date && (
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next Billing</span>
                </div>
                <Badge variant="outline">
                  {new Date(subscriptionsDashboard.next_billing_date).toLocaleDateString()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Last 6 months revenue performance
          </p>
        </CardHeader>
        <CardContent>
          {revenueReport.monthly_revenue.length > 0 ? (
            <div className="space-y-4">
              {revenueReport.monthly_revenue.map((month) => {
                const isHighest = month.month === highestRevenueMonth.month && month.revenue > 0;
                const percentage = highestRevenueMonth.revenue > 0
                  ? Math.round((month.revenue / highestRevenueMonth.revenue) * 100)
                  : 0;

                return (
                  <div key={month.month}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                        {isHighest && month.revenue > 0 && (
                          <Badge variant="default" className="text-xs">Highest</Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold">
                        ${month.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          isHighest && month.revenue > 0
                            ? 'bg-green-600' 
                            : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No revenue data available for the past 6 months</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Financial Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
              <p className="text-3xl font-bold">${revenueReport.total_revenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Avg Transaction</p>
              <p className="text-3xl font-bold">
                ${revenueReport.transaction_count > 0 
                  ? Math.round(revenueReport.total_revenue / revenueReport.transaction_count).toLocaleString()
                  : 0}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Subscription Revenue</p>
              <p className="text-3xl font-bold">
                ${subscriptionsDashboard.total_revenue.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Active Rate</p>
              <p className={`text-3xl font-bold ${activeSubRate > 80 ? 'text-green-600' : activeSubRate > 60 ? 'text-orange-500' : 'text-destructive'}`}>
                {activeSubRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Churn Alert */}
      {churnRate > 20 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">High Churn Rate Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-2xl font-bold text-destructive">{churnRate}%</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionsDashboard.cancelled_subscriptions} cancelled subscriptions
                </p>
              </div>
              <XCircle className="h-12 w-12 text-destructive opacity-20" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Revenue Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Company Revenue Breakdown</CardTitle>
            </div>
            <Button
              onClick={() => fetchCompanies()}
              variant="outline"
              size="sm"
              disabled={isLoadingCompanies}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCompanies ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCompanies ? (
            <div className="p-8">
              <LoadingSpinner size="md" text="Loading companies..." />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No company data available
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Companies</p>
                  <p className="text-2xl font-bold">{companies.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">
                    {companies.reduce((sum, c) => sum + c.user_count, 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Combined Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${companies.reduce((sum, c) => sum + c.total_revenue, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Per-company rows */}
              {companies
                .slice()
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .map((company) => {
                  const totalRevenue = companies.reduce((sum, c) => sum + c.total_revenue, 0)
                  const revenueShare = totalRevenue > 0
                    ? Math.round((company.total_revenue / totalRevenue) * 100)
                    : 0

                  return (
                    <div key={company.company_id} className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.user_count} user{company.user_count !== 1 ? 's' : ''} ·{' '}
                              <span className={company.is_active ? 'text-green-600' : 'text-destructive'}>
                                {company.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            ${company.total_revenue.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{revenueShare}% of total</p>
                        </div>
                      </div>
                      {/* Revenue share bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${revenueShare}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}