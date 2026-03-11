// src/app/analytics/layout.tsx
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Package, Truck, Factory, Warehouse, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsLayoutProps {
  children: ReactNode;
}

const analyticsNavItems = [
  {
    title: 'Overview',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Inventory',
    href: '/analytics/inventory',
    icon: Package,
  },
  {
    title: 'Distribution',
    href: '/analytics/distribution',
    icon: Truck,
  },
  {
    title: 'Production',
    href: '/analytics/production',
    icon: Factory,
  },
  {
    title: 'Warehousing',
    href: '/analytics/warehousing',
    icon: Warehouse,
  },
];

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Tabs */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container px-4">
          <nav className="flex space-x-1 overflow-x-auto py-2">
            {analyticsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-muted/10">
        <div className="container py-6 px-4">
          {/* Back to Dashboard */}
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Dashboard / Analytics
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}