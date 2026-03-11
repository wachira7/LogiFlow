// src/components/analytics/WarehousingChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Warehouse, ArrowRightLeft } from 'lucide-react';
import type { WarehousingDashboard, StockMovementsReport } from '@/types/analytics.types';

// ── Transfer Status Bar Chart ─────────────────────────────────────────────────

interface TransferStatusChartProps {
  data: WarehousingDashboard;
  title?: string;
}

export function TransferStatusChart({
  data,
  title = 'Transfer Status Overview',
}: TransferStatusChartProps) {
  const chartData = [
    { status: 'Pending',    count: data.pending_transfers,    fill: '#f59e0b' },
    { status: 'In Transit', count: data.in_transit_transfers, fill: '#3b82f6' },
    { status: 'Completed',  count: data.completed_transfers,  fill: '#10b981' },
    { status: 'Cancelled',  count: data.cancelled_transfers,  fill: '#ef4444' },
  ].filter(d => d.count > 0);

  const completionRate = data.total_transfers > 0
    ? Math.round((data.completed_transfers / data.total_transfers) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Warehouse className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_transfers} total transfers · {data.monthly_transfers} this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="status" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, 'Transfers']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" name="Transfers" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <rect key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-xl font-bold text-green-600">{completionRate}%</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Transfer Time</p>
                <p className="text-xl font-bold">{data.average_transfer_days} days</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">In-Transit Value</p>
                <p className="text-xl font-bold">${data.in_transit_value.toLocaleString()}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground">
            <p>No transfer data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Stock Movements Chart ─────────────────────────────────────────────────────

interface StockMovementsChartProps {
  data: StockMovementsReport;
  title?: string;
}

export function StockMovementsChart({
  data,
  title = 'Stock Movements Between Warehouses',
}: StockMovementsChartProps) {
  // Top 8 movement pairs by total items
  const chartData = [...data.stock_movements]
    .sort((a, b) => b.total_items - a.total_items)
    .slice(0, 8)
    .map(m => ({
      route: `${m.source_warehouse.slice(0, 8)}… → ${m.destination_warehouse.slice(0, 8)}…`,
      items: m.total_items,
      value: m.total_value,
      transfers: m.transfer_count,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_movement_pairs} unique warehouse routes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="route"
                  stroke="#6b7280"
                  fontSize={10}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'value' ? `$${value.toLocaleString()}` : value,
                    name === 'items' ? 'Items Moved' : name === 'value' ? 'Total Value' : 'Transfers',
                  ]}
                />
                <Legend />
                <Bar dataKey="items"     name="Items Moved" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="transfers" name="Transfers"   fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No stock movement data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Monthly Transfers Line Chart ──────────────────────────────────────────────

interface MonthlyTransfersChartProps {
  dashboard: WarehousingDashboard;
  title?: string;
}

export function MonthlyTransfersChart({
  dashboard,
  title = 'Monthly Transfer Activity',
}: MonthlyTransfersChartProps) {
  // Build a simple current-month snapshot since we only have summary data
  const chartData = [
    { label: 'Total',     value: dashboard.total_transfers },
    { label: 'This Month',value: dashboard.monthly_transfers },
    { label: 'Completed', value: dashboard.monthly_completed },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Warehouse className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          All-time vs this month&apos;s transfer performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
           <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                <Tooltip
                formatter={(value: number) => [value, 'Transfers']}
                contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                }}
                />
                <Line
                type="monotone"
                dataKey="value"
                name="Transfers"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 7 }}
                />
            </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}