// src/components/analytics/TenantFinancialSummary.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Package, AlertTriangle } from 'lucide-react';
import type { DistributionDashboard, StockReport } from '@/types/analytics.types';
import type { UserSubscription } from '@/types/billing.types';

interface TenantFinancialSummaryProps {
  distribution: DistributionDashboard;
  inventory:    StockReport;
  subscription: UserSubscription | null;
}

// Helpers 

function MetricRow({
  label,
  value,
  sub,
  color = '',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

// Main Component 

export function TenantFinancialSummary({
  distribution,
  inventory,
  subscription,
}: TenantFinancialSummaryProps) {
  // ── Revenue ──
  const totalRevenue   = distribution.total_revenue;
  const monthlyRevenue = distribution.monthly_revenue;

  // ── Known expenses ──
  const subscriptionCost = subscription
    ? parseFloat(subscription.plan_price)
    : 0;

  // Stock value = capital tied up (not an "expense" per se but a liability metric)
  const stockValue = inventory.total_stock_value;

  // ── Estimates ──
  // Gross profit = revenue - subscription platform cost
  // (rough — real COGS would include material, shipping, labour)
  const grossProfit        = totalRevenue - subscriptionCost;
  const grossProfitMonthly = monthlyRevenue - subscriptionCost;
  const profitMargin       = totalRevenue > 0
    ? Math.round((grossProfit / totalRevenue) * 100)
    : 0;

  const isHealthy = grossProfit > 0 && profitMargin > 20;
  const isWarning = grossProfit > 0 && profitMargin <= 20;
  const isLoss    = grossProfit < 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Financial Overview</CardTitle>
          </div>
          <Badge
            variant={isHealthy ? 'default' : isWarning ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {isHealthy ? 'Healthy' : isWarning ? 'Watch margin' : 'Loss'}
          </Badge>
        </div>
        <CardDescription>
          Aggregated from your distribution, inventory, and billing data.
          {' '}
          <span className="text-xs text-muted-foreground italic">
            Full expense tracking coming in the Finance module.
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Top KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Revenue */}
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-extrabold text-green-700 dark:text-green-300">
              ${totalRevenue.toLocaleString()}
            </p>
          </div>

          {/* Monthly Revenue */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <ShoppingCart className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-xl font-extrabold text-blue-700 dark:text-blue-300">
              ${monthlyRevenue.toLocaleString()}
            </p>
          </div>

          {/* Known Expenses */}
          <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Platform Cost</p>
            <p className="text-xl font-extrabold text-red-700 dark:text-red-300">
              ${subscriptionCost.toLocaleString()}
            </p>
          </div>

          {/* Estimated Gross Profit */}
          <div className={`text-center p-4 rounded-lg border ${
            isLoss
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              : 'bg-muted border-border'
          }`}>
            <DollarSign className={`h-5 w-5 mx-auto mb-1 ${isLoss ? 'text-red-600' : 'text-muted-foreground'}`} />
            <p className="text-xs text-muted-foreground">Est. Gross Profit</p>
            <p className={`text-xl font-extrabold ${
              isLoss ? 'text-red-700 dark:text-red-300' : ''
            }`}>
              ${grossProfit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Breakdown rows ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Breakdown
          </p>

          <MetricRow
            label="Sales Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            sub={`${distribution.total_orders} orders delivered`}
            color="text-green-600"
            icon={<ShoppingCart className="h-4 w-4 text-green-600" />}
          />

          <MetricRow
            label="LogiFlow Subscription"
            value={`-$${subscriptionCost.toLocaleString()}`}
            sub={subscription
              ? `${subscription.plan_name}`
              : 'No active plan'}
            color="text-red-500"
            icon={<CreditCard className="h-4 w-4 text-red-500" />}
          />

          <MetricRow
            label="Capital in Stock"
            value={`$${stockValue.toLocaleString()}`}
            sub={`${inventory.total_products} products in inventory`}
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />

          <MetricRow
            label="Est. Gross Profit (all time)"
            value={`$${grossProfit.toLocaleString()} (${profitMargin}%)`}
            sub="Revenue minus platform subscription cost"
            color={isLoss ? 'text-red-600' : 'text-green-600'}
            icon={
              isLoss
                ? <TrendingDown className="h-4 w-4 text-red-600" />
                : <TrendingUp className="h-4 w-4 text-green-600" />
            }
          />

          <MetricRow
            label="Est. Monthly Profit"
            value={`$${grossProfitMonthly.toLocaleString()}`}
            sub="This month's revenue minus subscription"
            color={grossProfitMonthly < 0 ? 'text-red-600' : 'text-green-600'}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* ── Disclaimer ── */}
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            <strong>Estimate only.</strong> This does not include warehouse costs,
            labour, shipping, materials, or other operational expenses.
            A full P&amp;L will be available in the upcoming Finance module.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}