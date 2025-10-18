// src/components/billing/TransactionList.tsx
'use client';

import { useState } from 'react';
import { useTransactions } from '@/hooks/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Download,
  Search,
  Filter,
  Receipt,
  CreditCard,
  Smartphone,
  Bitcoin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import type { TransactionFilters, TransactionStatus, PaymentProvider } from '@/types/billing.types';
import { format } from 'date-fns';

export function TransactionList() {
  const [filters, setFilters] = useState<TransactionFilters>({
    ordering: '-created_at'
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { transactions, loading, error } = useTransactions(filters);

  // Filter transactions by search query
  const filteredTransactions = transactions.filter((transaction) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.invoice_number.toLowerCase().includes(searchLower) ||
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.provider_transaction_id.toLowerCase().includes(searchLower)
    );
  });

  // Get status color and icon
  const getStatusDisplay = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'bg-green-500',
          label: 'Completed'
        };
      case 'PENDING':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-yellow-500',
          label: 'Pending'
        };
      case 'FAILED':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-red-500',
          label: 'Failed'
        };
      case 'REFUNDED':
        return {
          icon: <DollarSign className="h-4 w-4" />,
          color: 'bg-blue-500',
          label: 'Refunded'
        };
    }
  };

  // Get provider icon
  const getProviderIcon = (provider: PaymentProvider) => {
    switch (provider) {
      case 'STRIPE':
        return <CreditCard className="h-4 w-4" />;
      case 'MPESA':
        return <Smartphone className="h-4 w-4" />;
      case 'CRYPTO':
        return <Bitcoin className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transaction History</h2>
          <p className="text-muted-foreground">
            View all your payment transactions and invoices
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : (value as TransactionStatus) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select
              value={filters.provider || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, provider: value === 'all' ? undefined : (value as PaymentProvider) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
                <SelectItem value="MPESA">M-Pesa</SelectItem>
                <SelectItem value="CRYPTO">Crypto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10 text-muted-foreground" />}
          title="No transactions found"
          description={
            searchQuery
              ? "No transactions match your search criteria"
              : "You haven't made any transactions yet"
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const statusDisplay = getStatusDisplay(transaction.status);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), 'HH:mm')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.payment_type}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {transaction.invoice_number || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getProviderIcon(transaction.provider)}
                          <span>{transaction.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {transaction.status === 'REFUNDED' && '- '}
                        ${parseFloat(transaction.amount).toFixed(2)}
                        <p className="text-xs text-muted-foreground font-normal">
                          {transaction.currency}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusDisplay.color} text-white border-0`}
                        >
                          <span className="flex items-center gap-1">
                            {statusDisplay.icon}
                            {statusDisplay.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={transaction.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Receipt className="h-4 w-4 mr-2" />
                              Receipt
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredTransactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {filteredTransactions.filter(t => t.status === 'COMPLETED').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredTransactions.filter(t => t.status === 'PENDING').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Amount</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                $
                {filteredTransactions
                  .filter(t => t.status === 'COMPLETED')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                  .toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}