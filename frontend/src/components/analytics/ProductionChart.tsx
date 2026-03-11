// src/components/analytics/ProductionChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Factory, AlertTriangle } from 'lucide-react';
import type { ProductionDashboard, MaterialRequirementsReport } from '@/types/analytics.types';

//Production Orders Radial Chart 
interface ProductionOrdersChartProps {
  data: ProductionDashboard;
  title?: string;
}

export function ProductionOrdersChart({
  data,
  title = 'Production Orders Status',
}: ProductionOrdersChartProps) {
  const total = data.total_orders || 1; // prevent division by zero

  const radialData = [
    {
      name: 'Completed',
      value: Math.round((data.completed_orders / total) * 100),
      count: data.completed_orders,
      fill: '#10b981',
    },
    {
      name: 'In Progress',
      value: Math.round((data.in_progress_orders / total) * 100),
      count: data.in_progress_orders,
      fill: '#f59e0b',
    },
    {
      name: 'Planned',
      value: Math.round((data.planned_orders / total) * 100),
      count: data.planned_orders,
      fill: '#3b82f6',
    },
    {
      name: 'Cancelled',
      value: Math.round((data.cancelled_orders / total) * 100),
      count: data.cancelled_orders,
      fill: '#ef4444',
    },
  ].filter(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Factory className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_orders} total · {data.monthly_completed} completed this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {radialData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="25%"
                outerRadius="90%"
                data={radialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 11, fontWeight: 600 }}
                >
                  {radialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </RadialBar>
                <Tooltip
                  formatter={(value: number, name: string, props) => [
                    `${props.payload.count} orders (${value}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  iconType="circle"
                  formatter={(value, entry) =>
                    `${value} (${(entry.payload as { count: number }).count})`
                  }
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Overdue alert */}
            {data.overdue_orders > 0 && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-destructive/30 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive font-medium">
                  {data.overdue_orders} order
                  {data.overdue_orders > 1 ? 's are' : ' is'} overdue
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            <p>No production order data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Material Shortage Bar Chart
interface MaterialShortageChartProps {
  data: MaterialRequirementsReport;
  title?: string;
}

export function MaterialShortageChart({
  data,
  title = 'Material Requirements vs Availability',
}: MaterialShortageChartProps) {
  const shortageItems = data.material_requirements
    .filter(m => m.shortage > 0)
    .slice(0, 8)
    .map(m => ({
      name: m.product_name.length > 14
        ? m.product_name.slice(0, 14) + '…'
        : m.product_name,
      required:  m.required_quantity,
      available: m.available_stock,
      shortage:  m.shortage,
    }));

  const allAvailable = data.materials_with_shortage === 0 && data.total_materials > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          {data.materials_with_shortage > 0
            ? <AlertTriangle className="h-5 w-5 text-destructive" />
            : <Factory className="h-5 w-5 text-green-600" />
          }
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_materials} materials tracked ·{' '}
          {data.materials_with_shortage > 0
            ? <span className="text-destructive font-medium">
                {data.materials_with_shortage} with shortage
              </span>
            : <span className="text-green-600 font-medium">all available</span>
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allAvailable ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-3">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Factory className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-600">
              All {data.total_materials} materials fully stocked
            </p>
          </div>
        ) : shortageItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={shortageItems}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#6b7280"
                fontSize={11}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="required"
                name="Required"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="available"
                name="Available"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="shortage"
                name="Shortage"
                fill="#ef4444"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No material data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}