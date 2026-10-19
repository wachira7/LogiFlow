// src/app/analytics/layout.tsx
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Package, Truck, Factory, Warehouse } from 'lucide-react';
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
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-sm" aria-label="Analytics sections">
        {analyticsNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-soft text-brand' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}