// src/components/production/ProductionDashboard.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionOrders } from '@/hooks/useProduction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Factory, Plus, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Package, Calendar } from 'lucide-react'

export function ProductionDashboard() {
  const router = useRouter()
  const { 
    orders = [],
    dashboard, 
    materialRequirements,
    loading, 
    fetchOrders,
    fetchDashboard,
    fetchMaterialRequirements
  } = useProductionOrders()

  // DECLARE the function FIRST with useCallback
  const loadDashboardData = useCallback(async () => {
    await Promise.all([
      fetchDashboard(),
      fetchMaterialRequirements(),
      fetchOrders({ ordering: '-created_at' })
    ])
  }, [fetchDashboard, fetchMaterialRequirements, fetchOrders]) // Add dependencies

  // THEN use it in useEffect
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5)

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production</h2>
          <p className="text-muted-foreground">
            Monitor and manage your production operations
          </p>
        </div>
        <Button onClick={() => router.push('/production/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Production Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold">{dashboard?.total_orders || 0}</p>
              </div>
              <Factory className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{dashboard?.in_progress_orders || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{dashboard?.completed_orders || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{dashboard?.overdue_orders || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planned Orders</p>
                <p className="text-2xl font-bold">{dashboard?.planned_orders || 0}</p>
              </div>
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancelled Orders</p>
                <p className="text-2xl font-bold">{dashboard?.cancelled_orders || 0}</p>
              </div>
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Completed</p>
                <p className="text-2xl font-bold">{dashboard?.monthly_completed || 0}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Requirements Alert */}
      {materialRequirements && materialRequirements.materials_with_shortage > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Material Shortage Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              {materialRequirements.materials_with_shortage} material(s) have insufficient stock for active production orders.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/production/materials')}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              View Material Requirements
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Material Requirements Summary */}
      {materialRequirements && materialRequirements.material_requirements && materialRequirements.material_requirements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Material Requirements</span>
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/production/materials')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Required Qty</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Shortage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialRequirements.material_requirements.slice(0, 5).map((material, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{material.product_name}</TableCell>
                    <TableCell>{material.product_sku}</TableCell>
                    <TableCell>{material.required_quantity}</TableCell>
                    <TableCell>{material.available_stock}</TableCell>
                    <TableCell>
                      {material.shortage > 0 ? (
                        <span className="text-red-600 font-semibold">{material.shortage}</span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {material.shortage > 0 ? (
                        <Badge variant="destructive">Short</Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Production Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Production Orders</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/production/orders')}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No production orders yet</p>
              <p className="text-sm mb-4">Create your first production order to get started</p>
              <Button onClick={() => router.push('/production/orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Production Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/production/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.product_name}</p>
                        <p className="text-sm text-muted-foreground">{order.product_sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          order.status === 'COMPLETED' ? 'outline' :
                          order.status === 'IN_PROGRESS' ? 'default' :
                          order.status === 'CANCELLED' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${order.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(order.progress_percentage)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}