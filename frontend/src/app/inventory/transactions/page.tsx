//src/app/inventory/transactions/page.tsx
'use client'

import { useState } from 'react'
import { useTransactions, useProducts, useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Search, Filter, Calendar, TrendingUp, TrendingDown, RotateCcw, ArrowRightLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TRANSACTION_TYPES } from '@/types/inventory.types'
import type { TransactionFilter, TransactionType } from '@/types/inventory.types'

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filter, setFilter] = useState<TransactionFilter>({})

  const { transactions, isLoading, pagination, applyFilter } = useTransactions(filter)
  const { products } = useProducts()
  const { warehouses } = useWarehouses()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    applyFilter({ ...filter, search: query })
  }

  const handleFilterChange = (key: keyof TransactionFilter, value: unknown) => {
    const newFilter = { ...filter, [key]: value }
    setFilter(newFilter)
    applyFilter(newFilter)
  }

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'RECEIPT': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'SHIPMENT': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'RETURN': return <RotateCcw className="h-4 w-4 text-orange-600" />
      case 'ADJUSTMENT': return <RotateCcw className="h-4 w-4 text-blue-600" />
      case 'TRANSFER': return <ArrowRightLeft className="h-4 w-4 text-purple-600" />
    }
  }

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'RECEIPT': return 'bg-green-100 text-green-800 border-green-200'
      case 'SHIPMENT': return 'bg-red-100 text-red-800 border-red-200'
      case 'RETURN': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'ADJUSTMENT': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'TRANSFER': return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  const totalTransactions = transactions.length
  const inTransactions = transactions.filter(t => t.transaction_type === 'RECEIPT').length
  const outTransactions = transactions.filter(t => t.transaction_type === 'SHIPMENT').length
  const adjustmentTransactions = transactions.filter(t => t.transaction_type === 'ADJUSTMENT').length

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Transactions</h1>
          <p className="text-muted-foreground">
            Track all inventory movements and stock changes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{adjustmentTransactions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <Select
                value={filter.transaction_type || ''}
                onValueChange={(value) => handleFilterChange('transaction_type', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.product || ''}
                onValueChange={(value) => handleFilterChange('product', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.warehouse || ''}
                onValueChange={(value) => handleFilterChange('warehouse', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Input
                  type="date"
                  placeholder="From date"
                  value={filter.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  placeholder="To date"
                  value={filter.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Complete log of all inventory movements and changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description="Inventory transactions will appear here as you manage stock"
              icon={<Calendar className="h-12 w-12 text-muted-foreground/50" />}
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Reason / reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <Badge 
                            variant="outline" 
                            className={getTransactionColor(transaction.transaction_type)}
                          >
                            {TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label || transaction.transaction_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.product_name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {transaction.product_sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.warehouse_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {/* the stored quantity is signed: negative means stock went out */}
                          <span className={`font-medium tabular-nums ${transaction.quantity < 0 ? 'text-danger' : 'text-success'}`}>
                            {transaction.quantity < 0 ? '−' : '+'}
                            {Math.abs(transaction.quantity)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {transaction.unit_of_measure}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transaction.balance_after == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="tabular-nums">
                              <span className="text-muted-foreground">{transaction.balance_before}</span>
                              <span className="mx-1 text-xs text-muted-foreground">→</span>
                              <span className="font-medium">{transaction.balance_after}</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{transaction.reference || '-'}</div>
                          {transaction.notes && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(transaction.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transaction.performed_by_name || 'System'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.count > pagination.page_size && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                    {Math.min(pagination.page * pagination.page_size, pagination.count)} of{' '}
                    {pagination.count} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.previous}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}