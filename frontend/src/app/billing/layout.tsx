// src/app/billing/layout.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CreditCard, Wallet, Receipt, Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname === '/billing') return 'dashboard';
    if (pathname.startsWith('/billing/plans')) return 'plans';
    if (pathname.startsWith('/billing/subscriptions')) return 'subscriptions';
    if (pathname.startsWith('/billing/payment-methods')) return 'payment-methods';
    if (pathname.startsWith('/billing/transactions')) return 'transactions';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: '/billing',
      plans: '/billing/plans',
      subscriptions: '/billing/subscriptions',
      'payment-methods': '/billing/payment-methods',
      transactions: '/billing/transactions',
    };

    if (routes[value]) {
      router.push(routes[value]);
    }
  };

  // Don't show tabs on subscription detail page
  const showTabs = !pathname.match(/\/billing\/subscriptions\/[^/]+$/);

  return (
    <div className="min-h-screen bg-background">
      {showTabs && (
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="plans" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Plans</span>
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Subscriptions</span>
                </TabsTrigger>
                <TabsTrigger value="payment-methods" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Payment Methods</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      <main className="container mx-auto">
        {/* Breadcrumb — only on subscription detail page */}
        {!showTabs && (
          <div className="px-4 pt-4 flex items-center gap-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <Link
              href="/billing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Billing
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/billing/subscriptions')}
            >
              Subscriptions
            </Button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}