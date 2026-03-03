// src/components/warehousing/StockMovements.tsx
'use client'

import { useEffect } from 'react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ArrowRightLeft, TrendingUp, Package, BarChart3 } from 'lucide-react'

export function StockMovements() {
  const { stockMovements, loading, error, fetchStockMovements, dashboard, fetchDashboard } = useWarehouseTransfers()

  useEffect(() => {
    fetchStockMovements()
    fetchDashboard()
  }, [fetchDashboard, fetchStockMovements])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
  }

  if (error) {
    return (
      <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
        Failed to load stock movements: {error}
      </div>
    )
  }

  const movements = stockMovements?.stock_movements || []
  const totalPairs = stockMovements?.total_movement_pairs || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
        <p className="text-muted-foreground">Analysis of stock flow between warehouses</p>
      </div>

      {/* Summary Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Movements</p>
                  <div className="text-2xl font-bold">{totalPairs}</div>
                  <p className="text-xs text-muted-foreground">Unique warehouse pairs</p>
                </div>
                <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Transfers</p>
                  <div className="text-2xl font-bold text-green-600">{dashboard.completed_transfers}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Transit Value</p>
                  <div className="text-2xl font-bold text-blue-600">
                    ${Number(dashboard.in_transit_value).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Currently moving</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Transfer Time</p>
                  <div className="text-2xl font-bold">{dashboard.average_transfer_days}</div>
                  <p className="text-xs text-muted-foreground">Days per transfer</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Summary */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>Transfer activity for the current month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Transfers Initiated</span>
                <Badge variant="outline">{dashboard.monthly_transfers}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Transfers Completed</span>
                <Badge className="bg-green-100 text-green-800">{dashboard.monthly_completed}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Currently In Transit</span>
                <Badge className="bg-blue-100 text-blue-800">{dashboard.in_transit_transfers}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Pending Approval</span>
                <Badge className="bg-yellow-100 text-yellow-800">{dashboard.pending_transfers}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Status Breakdown</CardTitle>
              <CardDescription>All-time transfer status distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Completed', value: dashboard.completed_transfers, total: dashboard.total_transfers, color: 'bg-green-500' },
                { label: 'In Transit', value: dashboard.in_transit_transfers, total: dashboard.total_transfers, color: 'bg-blue-500' },
                { label: 'Pending', value: dashboard.pending_transfers, total: dashboard.total_transfers, color: 'bg-yellow-500' },
                { label: 'Cancelled', value: dashboard.cancelled_transfers, total: dashboard.total_transfers, color: 'bg-red-500' },
              ].map(({ label, value, total, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{value} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warehouse Pair Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Warehouse Pair Activity</span>
          </CardTitle>
          <CardDescription>
            Stock flow analysis between warehouse pairs (completed transfers only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No completed transfers yet</p>
              <p className="text-sm">Complete warehouse transfers to see movement analysis here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Warehouse</TableHead>
                  <TableHead>Destination Warehouse</TableHead>
                  <TableHead>Transfers</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{movement.source_warehouse}</TableCell>
                    <TableCell>{movement.destination_warehouse}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.transfer_count}</Badge>
                    </TableCell>
                    <TableCell>{movement.total_items}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(movement.total_value).toFixed(2)}
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