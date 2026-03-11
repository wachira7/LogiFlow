// src/components/analytics/InventoryChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, DollarSign } from 'lucide-react';
import type { StockReport, LowStockProduct } from '@/types/analytics.types';

// Stock Status Donut
interface StockStatusChartProps {
  data: StockReport;
  title?: string;
}

const STATUS_COLORS = {
  active:   '#10b981',
  inactive: '#6b7280',
  lowStock: '#ef4444',
};

export function StockStatusChart({
  data,
  title = 'Product Status Breakdown',
}: StockStatusChartProps) {
  const chartData = [
    { name: 'Active',    value: data.active_products,   color: STATUS_COLORS.active },
    { name: 'Inactive',  value: data.inactive_products,  color: STATUS_COLORS.inactive },
    { name: 'Low Stock', value: data.low_stock_products, color: STATUS_COLORS.lowStock },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {data.total_products} total products in system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre label overlay */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {chartData.map((item) => (
                <div
                  key={item.name}
                  className="text-center p-2 bg-muted rounded-lg"
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs text-muted-foreground">{item.name}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.total_products > 0
                      ? `${Math.round((item.value / data.total_products) * 100)}%`
                      : '0%'}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground">
            <p>No product data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Low Stock Bar Chart 
interface LowStockChartProps {
  products: LowStockProduct[];
  title?: string;
}

export function LowStockChart({
  products,
  title = 'Low Stock Products',
}: LowStockChartProps) {
  const chartData = products.slice(0, 8).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    current: p.current_stock,
    reorder: p.reorder_point,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-destructive" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Current stock vs reorder point (top {chartData.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
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
              <Bar dataKey="current" name="Current Stock" fill="#ef4444" radius={[0, 4, 4, 0]} />
              <Bar dataKey="reorder" name="Reorder Point" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No low stock products</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

//Stock Value Card 
interface StockValueCardProps {
  totalValue: number;
  totalProducts: number;
  activeProducts: number;
}

export function StockValueCard({
  totalValue,
  totalProducts,
  activeProducts,
}: StockValueCardProps) {
  const avgValue = totalProducts > 0 ? totalValue / totalProducts : 0;
  const activeValue = activeProducts > 0 ? (activeProducts / totalProducts) * totalValue : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <CardTitle>Stock Value Breakdown</CardTitle>
        </div>
        <CardDescription>Estimated inventory value</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Stock Value</p>
          <p className="text-4xl font-extrabold mt-1">
            ${totalValue.toLocaleString()}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Avg per Product</p>
            <p className="text-xl font-bold">
              ${Math.round(avgValue).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Active Stock Value</p>
            <p className="text-xl font-bold text-green-600">
              ${Math.round(activeValue).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}