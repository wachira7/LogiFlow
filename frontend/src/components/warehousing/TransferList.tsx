// src/components/warehousing/TransferList.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Search, Eye, Edit, Trash2, Filter, Package, ArrowRightLeft } from 'lucide-react'
import type { TransferStatus } from '@/types/warehousing.types'

const statusColors: Record<TransferStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<TransferStatus, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function TransferList() {
  const router = useRouter()
  const { 
    transfers, 
    loading, 
    error, 
    fetchTransfers,
    deleteTransfer 
  } = useWarehouseTransfers()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'ALL'>('ALL')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null)

  useEffect(() => {
    const filters = {
      search: searchQuery || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }
    fetchTransfers(filters)
  }, [searchQuery, statusFilter, fetchTransfers])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as TransferStatus | 'ALL')
  }

  const handleView = (id: string) => {
    router.push(`/warehousing/transfers/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/warehousing/transfers/${id}/edit`)
  }

  const handleDeleteClick = (id: string) => {
    setTransferToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!transferToDelete) return

    try {
      await deleteTransfer(transferToDelete)
      setDeleteDialogOpen(false)
      setTransferToDelete(null)
    } catch (err) {
      console.error('Failed to delete transfer:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading && (!transfers || transfers.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  // Safety check - ensure transfers is always an array
  const transfersList = Array.isArray(transfers) ? transfers : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warehouse Transfers</h2>
          <p className="text-muted-foreground">
            Manage stock transfers between warehouses
          </p>
        </div>
        <Button onClick={() => router.push('/warehousing/transfers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transfer number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading transfers</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Transfers Table */}
      {transfersList.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
          title="No transfers found"
          description="Get started by creating your first warehouse transfer"
          action={
            <Button onClick={() => router.push('/warehousing/transfers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Transfer
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Number</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Initiated</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfersList.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      {transfer.transfer_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{transfer.source_warehouse_name}</span>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{transfer.destination_warehouse_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[transfer.status]}>
                        {statusLabels[transfer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{transfer.total_items} items</div>
                        <div className="text-muted-foreground">
                          {transfer.total_quantity} units
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(transfer.total_value)}</TableCell>
                    <TableCell>{formatDate(transfer.initiated_at)}</TableCell>
                    <TableCell>{transfer.initiated_by_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(transfer.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {transfer.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transfer.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {(transfer.status === 'PENDING' || transfer.status === 'CANCELLED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(transfer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Transfer"
        description="Are you sure you want to delete this transfer? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}