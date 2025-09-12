// /src/components/inventory/transactions/TransactionList.tsx
'use client'

import { useState } from 'react'
import { useTransactions } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Package,
  Calendar,
  Filter
} from 'lucide-react'
import Link from 'next/link'

const transactionTypes = [
  { value: '', label: 'All Types' },
  { value: 'stock_in', label: 'Stock In' },
  { value: 'stock_out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'return', label: 'Return' },
  { value: 'sale', label: 'Sale' },
  { value: 'purchase', label: 'Purchase' }
]

export function TransactionList() {
  const { transactions, isLoading } = useTransactions()
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    date_from: '',
    date_to: ''
  })

  const filteredTransactions = transactions?.filter(transaction => {
    if (filters.search && !transaction.reference.toLowerCase().includes(filters.search.toLowerCase()) &&
        !transaction.item_name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.type && transaction.type !== filters.type) return false
    
    // Date filtering
    if (filters.date_from) {
      const transactionDate = new Date(transaction.created_at)
      const fromDate = new Date(filters.date_from)
      if (transactionDate < fromDate) return false
    }
    if (filters.date_to) {
      const transactionDate = new Date(transaction.created_at)
      const toDate = new Date(filters.date_to)
      toDate.setHours(23, 59, 59, 999) // End of day
      if (transactionDate > toDate) return false
    }
    
    return true
  }) || []

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      date_from: '',
      date_to: ''
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
      case 'purchase':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'stock_out':
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'transfer':
        return <Package className="h-4 w-4 text-purple-600" />
      default:
        return <History className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'stock_in':
      case 'purchase':
        return 'default'
      case 'stock_out':
      case 'sale':
        return 'destructive'
      case 'adjustment':
        return 'secondary'
      case 'transfer':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatQuantity = (quantity: number, type: string) => {
    const sign = ['stock_out', 'sale'].includes(type) ? '-' : '+'
    return `${sign}${Math.abs(quantity)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTransactionType = (type: string) => {
    return transactionTypes.find(t => t.value === type)?.label || type
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length
  }

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
          <h2 className="text-2xl font-bold">Inventory Transactions</h2>
          <p className="text-muted-foreground">Track all inventory movements and changes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {filteredTransactions.length} transactions
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
              )}
            </div>
            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => updateFilter('date_from', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => updateFilter('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <History className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={<History className="h-12 w-12 text-muted-foreground/50" />}
              title="No transactions found"
              description={getActiveFiltersCount() > 0 ? 
                "No transactions match your current filters." : 
                "No inventory transactions have been recorded yet."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.reference}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.type)}
                        <Badge variant={getTransactionBadgeVariant(transaction.type)}>
                          {formatTransactionType(transaction.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{transaction.item_name}</div>
                        {transaction.item_sku && (
                          <div className="text-sm text-muted-foreground font-mono">
                            {transaction.item_sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          ['stock_out', 'sale'].includes(transaction.type) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatQuantity(transaction.quantity, transaction.type)}
                        </span>
                        {transaction.unit && (
                          <span className="text-sm text-muted-foreground">
                            {transaction.unit}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.warehouse_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(transaction.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/transactions/${transaction.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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