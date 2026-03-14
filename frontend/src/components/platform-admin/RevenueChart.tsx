// src/components/platform-admin/RevenueChart.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: MonthlyRevenue[];
  title?: string;
  description?: string;
  type?: 'line' | 'bar';
}

export function RevenueChart({ 
  data, 
  title = "Revenue Trend", 
  description = "Monthly revenue over time",
  type = 'line' 
}: RevenueChartProps) {
  // Format data for display
  const formattedData = data.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    }),
    revenue: item.revenue,
  }));

  // Calculate trend
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;
  const lastMonthRevenue = data.length > 0 ? data[data.length - 1].revenue : 0;
  const trend = avgRevenue > 0 ? ((lastMonthRevenue - avgRevenue) / avgRevenue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {type === 'line' ? (
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px' 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </LineChart>
            ) : (
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px' 
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                  name="Revenue"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No revenue data available</p>
          </div>
        )}
        
        {/* Trend Indicator */}
        {data.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Average Monthly</p>
              <p className="text-lg font-bold">${Math.round(avgRevenue).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Trend</p>
              <p className={`text-lg font-bold ${trend >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payment Provider Distribution Chart
interface ProviderRevenue {
  stripe: number;
  mpesa: number;
  crypto: number;
}

interface PaymentProviderChartProps {
  data: ProviderRevenue;
  title?: string;
}

const COLORS = {
  stripe: '#6366f1',
  mpesa: '#10b981',
  crypto: '#f59e0b',
};

export function PaymentProviderChart({ 
  data, 
  title = "Revenue by Payment Provider" 
}: PaymentProviderChartProps) {
  const chartData = [
    { name: 'Stripe', value: data.stripe, color: COLORS.stripe },
    { name: 'M-Pesa', value: data.mpesa, color: COLORS.mpesa },
    { name: 'Crypto', value: data.crypto, color: COLORS.crypto },
  ].filter(item => item.value > 0); // Only show providers with revenue

  const totalRevenue = data.stripe + data.mpesa + data.crypto;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>Distribution across payment methods</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    if (typeof percent === 'undefined') {
                        return '';
                    }
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${item.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalRevenue > 0 ? Math.round((item.value / totalRevenue) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No payment provider data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}