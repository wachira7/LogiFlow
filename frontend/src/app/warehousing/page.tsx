// src/app/warehousing/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRightLeft,
  Plus,
} from 'lucide-react'

export default function WarehousingPage() {
  const router = useRouter()
  const { dashboard, loading, fetchDashboard } = useWarehouseTransfers()

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Warehousing</h2>
          <p className="text-muted-foreground">
            Manage warehouse transfers and stock movements
          </p>
        </div>
        <Button onClick={() => router.push('/warehousing/transfers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.total_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time transfers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pending_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.in_transit_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently moving
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.completed_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.monthly_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.monthly_completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.average_transfer_days || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              Average transfer time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(dashboard?.in_transit_value || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current transfer value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => router.push('/warehousing/transfers')}
          >
            <Package className="h-4 w-4 mr-2" />
            View All Transfers
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => router.push('/warehousing/transfers/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Transfer
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => router.push('/warehousing/reports')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}