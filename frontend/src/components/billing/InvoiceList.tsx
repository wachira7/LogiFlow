// src/components/billing/InvoiceList.tsx
'use client';

import { useState } from 'react';
import { useTransactions } from '@/hooks/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Receipt, Download, Search, Filter,
  ExternalLink, CheckCircle2, XCircle, Clock, RefreshCw,
} from 'lucide-react';
import type { TransactionStatus, PaymentProvider } from '@/types/billing.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransactionStatus }) {
  const map: Record<TransactionStatus, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: React.ReactNode;
  }> = {
    COMPLETED: { label: 'Paid',      variant: 'default',     icon: <CheckCircle2 className="h-3 w-3" /> },
    PENDING:   { label: 'Pending',   variant: 'outline',     icon: <Clock className="h-3 w-3" /> },
    FAILED:    { label: 'Failed',    variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    REFUNDED:  { label: 'Refunded',  variant: 'secondary',   icon: <RefreshCw className="h-3 w-3" /> },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 text-xs">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function ProviderBadge({ provider }: { provider: PaymentProvider }) {
  const map: Record<PaymentProvider, string> = {
    STRIPE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    MPESA:  'bg-green-100  text-green-700  dark:bg-green-900  dark:text-green-300',
    CRYPTO: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${map[provider] ?? ''}`}>
      {provider === 'STRIPE' ? 'Card' : provider === 'MPESA' ? 'M-Pesa' : 'Crypto'}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function InvoiceList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  const { transactions, loading, error, refetch } = useTransactions();

  // Client-side filtering
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      tx.provider_transaction_id?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const matchesProvider = providerFilter === 'ALL' || tx.provider === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  });

  // Summary stats
  const totalPaid = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices & Receipts</h2>
          <p className="text-muted-foreground">
            Your complete payment history for LogiFlow
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.status === 'COMPLETED').length} payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount > 0 ? 'Awaiting confirmation' : 'All clear'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">PaymentHistory</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            View and manage your past invoices and receipts
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Providers</SelectItem>
                <SelectItem value="STRIPE">Card (Stripe)</SelectItem>
                <SelectItem value="MPESA">M-Pesa</SelectItem>
                <SelectItem value="CRYPTO">Crypto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-5 w-5" />}
              title="No invoices found"
              description={
                search || statusFilter !== 'ALL' || providerFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Your payment history will appear here'
              }
            />
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[1fr_140px_100px_100px_80px] gap-4 px-6 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Description</span>
                <span>Date</span>
                <span>Provider</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {filtered.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_100px_80px] gap-2 md:gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Description + Invoice # */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || 'LogiFlow Subscription'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tx.invoice_number && (
                          <span className="text-xs text-muted-foreground">
                            #{tx.invoice_number}
                          </span>
                        )}
                        {tx.receipt_url && (
                          <a
                            href={tx.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-0.5 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Receipt
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Provider */}
                    <div className="flex items-center">
                      <ProviderBadge provider={tx.provider} />
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <StatusBadge status={tx.status} />
                    </div>

                    {/* Amount */}
                    <div className="flex items-center md:justify-end">
                      <span className={`text-sm font-semibold ${
                        tx.status === 'REFUNDED' ? 'text-muted-foreground line-through' :
                        tx.status === 'FAILED'   ? 'text-red-500' : ''
                      }`}>
                        {tx.currency} {parseFloat(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer count */}
              <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                Showing {filtered.length} of {transactions.length} invoice
                {transactions.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}