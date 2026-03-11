// src/components/analytics/DistributionChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Truck, TrendingUp } from 'lucide-react';
import type { TrackingReport, DistributionDashboard } from '@/types/analytics.types';

//Shipment Pipeline (Funnel) 
interface ShipmentPipelineChartProps {
  data: TrackingReport;
  title?: string;
}

const PIPELINE_COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

export function ShipmentPipelineChart({
  data,
  title = 'Shipment Pipeline',
}: ShipmentPipelineChartProps) {
  const funnelData = [
    { name: 'Pending',   value: data.pending_shipments,   fill: PIPELINE_COLORS[0] },
    { name: 'Picked',    value: data.picked_shipments,    fill: PIPELINE_COLORS[1] },
    { name: 'Packed',    value: data.packed_shipments,    fill: PIPELINE_COLORS[2] },
    { name: 'Shipped',   value: data.shipped_shipments,   fill: PIPELINE_COLORS[3] },
    { name: 'Delivered', value: data.delivered_shipments, fill: PIPELINE_COLORS[4] },
  ].filter(d => d.value > 0);

  const total = funnelData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Shipments progress through each fulfilment stage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {funnelData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList
                    position="right"
                    fill="#374151"
                    stroke="none"
                    dataKey="name"
                    fontSize={12}
                  />
                  {funnelData.map((entry, index) => (
                    <LabelList
                      key={`label-${index}`}
                      position="center"
                      fill="#fff"
                      stroke="none"
                      dataKey="value"
                      fontSize={13}
                      fontWeight={600}
                    />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>

            {/* Conversion rate row */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Delivery Rate</p>
                <p className="text-xl font-bold text-green-600">
                  {total > 0
                    ? `${Math.round((data.delivered_shipments / total) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Delivery</p>
                <p className="text-xl font-bold">
                  {data.average_delivery_days} days
                </p>
              </div>
            </div>

            {data.delayed_shipments > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-destructive/30 flex items-center justify-between">
                <p className="text-sm text-destructive font-medium">
                  ⚠ {data.delayed_shipments} delayed shipment
                  {data.delayed_shipments > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No shipment data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

//Orders Status Bar Chart 
interface OrdersStatusChartProps {
  data: DistributionDashboard;
  title?: string;
}

export function OrdersStatusChart({
  data,
  title = 'Orders Status Overview',
}: OrdersStatusChartProps) {
  const chartData = [
    { status: 'New',        count: data.new_orders,        fill: '#3b82f6' },
    { status: 'Processing', count: data.processing_orders, fill: '#f59e0b' },
    { status: 'Shipped',    count: data.shipped_orders,    fill: '#8b5cf6' },
    { status: 'Delivered',  count: data.delivered_orders,  fill: '#10b981' },
    { status: 'Cancelled',  count: data.cancelled_orders,  fill: '#ef4444' },
  ].filter(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_orders} total orders · {data.monthly_orders} this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="status" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, 'Orders']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            <p>No order data available</p>
          </div>
        )}

        {/* Revenue summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">${data.total_revenue.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Monthly Revenue</p>
            <p className="text-xl font-bold">${data.monthly_revenue.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}