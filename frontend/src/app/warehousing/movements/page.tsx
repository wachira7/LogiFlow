// src/app/warehousing/movements/page.tsx
'use client'

import { useEffect } from 'react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ArrowRightLeft, TrendingUp } from 'lucide-react'

export default function StockMovementsPage() {
  const { stockMovements, loading, fetchStockMovements } = useWarehouseTransfers()

  useEffect(() => {
    fetchStockMovements()
  }, [fetchStockMovements])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Stock Movements</h2>
        <p className="text-muted-foreground">
          Analysis of completed transfers between warehouses
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Movement Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stockMovements?.total_movement_pairs || 0}
          </div>
          <p className="text-sm text-muted-foreground">
            Unique warehouse movement pairs
          </p>
        </CardContent>
      </Card>

      {/* Movements Table */}
      {!stockMovements?.stock_movements || stockMovements.stock_movements.length === 0 ? (
        <EmptyState
          icon={< ArrowRightLeft className="h-12 w-12 text-muted-foreground/50" />}
          title="No stock movements found"
          description="Complete some transfers to see movement analysis"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Movement Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Warehouse</TableHead>
                  <TableHead>Destination Warehouse</TableHead>
                  <TableHead>Transfer Count</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.stock_movements.map((movement, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {movement.source_warehouse}
                    </TableCell>
                    <TableCell>{movement.destination_warehouse}</TableCell>
                    <TableCell>{movement.transfer_count} transfers</TableCell>
                    <TableCell>{movement.total_items} items</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(movement.total_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
