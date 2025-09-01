// components/dashboard/DashboardStats.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Package, ShoppingCart, Truck } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const statIcons = {
  users: Users,
  products: Package,
  orders: ShoppingCart,
  shipments: Truck,
}

export function DashboardStats() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Failed to load statistics</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { stats } = data

  const statItems = [
    {
      title: 'Team Members',
      value: stats.total_users,
      icon: statIcons.users,
      description: 'Active users in your company',
      color: 'text-blue-600',
    },
    {
      title: 'Products',
      value: stats.total_products,
      icon: statIcons.products,
      description: 'Items in inventory',
      color: 'text-green-600',
    },
    {
      title: 'Pending Orders',
      value: stats.pending_orders,
      icon: statIcons.orders,
      description: 'Orders awaiting processing',
      color: 'text-orange-600',
    },
    {
      title: 'Active Shipments',
      value: stats.active_shipments,
      icon: statIcons.shipments,
      description: 'Shipments in transit',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}