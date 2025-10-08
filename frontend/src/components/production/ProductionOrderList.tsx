// src/components/production/ProductionOrderList.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionOrders } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Play, CheckCircle, XCircle, Factory } from 'lucide-react'
import type { ProductionOrderStatus } from '@/types/production.types'

export function ProductionOrderList() {
  const router = useRouter()
  const { 
    orders = [],
    loading, 
    fetchOrders, 
    deleteOrder,
    startProduction,
    completeProduction,
    cancelProduction 
  } = useProductionOrders()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | 'ALL'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // DECLARE the function FIRST with useCallback
  const loadOrders = useCallback(async () => {
    const filters = statusFilter !== 'ALL' ? { status: statusFilter } : undefined
    await fetchOrders(filters)
  }, [statusFilter, fetchOrders]) // Add dependencies

  // THEN use it in useEffect
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleSearch = async () => {
    const filters = {
      ...(statusFilter !== 'ALL' && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }
    await fetchOrders(filters)
  }

  const handleStartProduction = async (id: string) => {
    setActionLoading(id)
    try {
      await startProduction(id)
      await loadOrders()
    } catch (error) {
      console.error('Failed to start production:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteProduction = async (id: string) => {
    setActionLoading(id)
    try {
      await completeProduction(id)
      await loadOrders()
    } catch (error) {
      console.error('Failed to complete production:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelProduction = async (id: string) => {
    setActionLoading(id)
    try {
      await cancelProduction(id)
      await loadOrders()
    } catch (error) {
      console.error('Failed to cancel production:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Are you sure you want to delete this production order?')) {
      try {
        await deleteOrder(id)
        await loadOrders()
      } catch (error) {
        console.error('Failed to delete order:', error)
      }
    }
  }

  const getStatusBadge = (status: ProductionOrderStatus) => {
    const variants: Record<ProductionOrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PLANNED: { variant: 'secondary', label: 'Planned' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
    }
    
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.product_sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production Orders</h2>
          <p className="text-muted-foreground">
            Manage and track your production orders
          </p>
        </div>
        <Button onClick={() => router.push('/production/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Production Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ProductionOrderStatus | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No production orders found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'ALL' 
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first production order'
                }
              </p>
              {!searchQuery && statusFilter === 'ALL' && (
                <Button onClick={() => router.push('/production/orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Production Order
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.product_name}</p>
                          <p className="text-sm text-muted-foreground">{order.product_sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
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
                        {order.start_date
                          ? new Date(order.start_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {order.end_date
                          ? new Date(order.end_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{order.created_by_name}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/production/orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {order.status === 'PLANNED' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/production/orders/${order.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStartProduction(order.id)}
                                  disabled={actionLoading === order.id}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Production
                                </DropdownMenuItem>
                              </>
                            )}

                            {order.status === 'IN_PROGRESS' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleCompleteProduction(order.id)}
                                  disabled={actionLoading === order.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCancelProduction(order.id)}
                                  disabled={actionLoading === order.id}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}

                            {order.status !== 'COMPLETED' && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
