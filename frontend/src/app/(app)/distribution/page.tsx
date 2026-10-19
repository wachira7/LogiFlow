// src/app/distribution/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/app/kit';
import { 
  Package, 
  Truck, 
  MapPin, 
  BarChart3, 
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export default function DistributionPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="Distribution"
        description="Orders, shipments, routes and deliveries across your distribution network."
      />
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Recent Orders
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shipments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Active Shipments
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'routes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Routes
          </button>
        </nav>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/orders/new">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">New Order</h3>
                  <p className="text-sm text-muted-foreground">Create customer order</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/shipments/new">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">New Shipment</h3>
                  <p className="text-sm text-muted-foreground">Create shipment</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/routes/new">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Plan Route</h3>
                  <p className="text-sm text-muted-foreground">Create delivery route</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/tracking">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Track Orders</h3>
                  <p className="text-sm text-muted-foreground">Monitor deliveries</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Main Content Grid - Conditional based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/distribution/orders">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">CUST-ORDER-001</p>
                      <p className="text-sm text-muted-foreground">ABC Electronics Store</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Delivered
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">$45,000.00</p>
                  </div>
                </div>

                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No other recent orders</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href="/distribution/orders/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Order
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pending Orders</span>
                </div>
                <span className="font-semibold">0</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">In Transit</span>
                </div>
                <span className="font-semibold">0</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Delivered</span>
                </div>
                <span className="font-semibold">1</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Issues</span>
                </div>
                <span className="font-semibold">0</span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Performance</span>
                  </div>
                  <span className="font-semibold text-green-600">100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">CUST-ORDER-001</p>
                    <p className="text-sm text-muted-foreground">ABC Electronics Store</p>
                    <p className="text-xs text-muted-foreground">orders@abcelectronics.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Delivered
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">$45,000.00</p>
                  <p className="text-xs text-muted-foreground">10 items</p>
                </div>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <p>No other orders to display</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'shipments' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active shipments</p>
              <p className="text-sm">Shipments will appear here when orders are shipped</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'routes' && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active routes</p>
              <p className="text-sm">Delivery routes will be shown here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/orders">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Package className="h-8 w-8 mx-auto text-blue-600" />
                <h3 className="font-semibold">Orders Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create, edit, and track customer orders
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/shipments">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Truck className="h-8 w-8 mx-auto text-green-600" />
                <h3 className="font-semibold">Shipments</h3>
                <p className="text-sm text-muted-foreground">
                  Manage shipment lifecycle and tracking
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/routes">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <MapPin className="h-8 w-8 mx-auto text-purple-600" />
                <h3 className="font-semibold">Delivery Routes</h3>
                <p className="text-sm text-muted-foreground">
                  Plan and optimize delivery routes
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/distribution/tracking">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <BarChart3 className="h-8 w-8 mx-auto text-orange-600" />
                <h3 className="font-semibold">Tracking & Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor performance and analytics
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}