// src/components/analytics/KPICards.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KPICard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  iconColor = 'text-muted-foreground',
  valueColor,
  trend 
}: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor || ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className={`text-xs mt-1 flex items-center ${trend.isPositive ? 'text-green-600' : 'text-destructive'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span className="ml-1">{Math.abs(trend.value)}%</span>
            <span className="ml-1 text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KPICardsGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5;
}

export function KPICardsGrid({ children, cols = 4 }: KPICardsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={`grid gap-4 ${gridCols[cols]}`}>
      {children}
    </div>
  );
}

// Pre-built common KPI cards
interface RevenueKPIProps {
  amount: number;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

export function RevenueKPI({ amount, description, trend }: RevenueKPIProps) {
  return (
    <KPICard
      title="Total Revenue"
      value={`$${amount.toLocaleString()}`}
      description={description}
      trend={trend}
    />
  );
}

interface OrdersKPIProps {
  count: number;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

export function OrdersKPI({ count, description, trend }: OrdersKPIProps) {
  return (
    <KPICard
      title="Total Orders"
      value={count}
      description={description}
      trend={trend}
    />
  );
}

interface ProductsKPIProps {
  count: number;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

export function ProductsKPI({ count, description, trend }: ProductsKPIProps) {
  return (
    <KPICard
      title="Total Products"
      value={count}
      description={description}
      trend={trend}
    />
  );
}
