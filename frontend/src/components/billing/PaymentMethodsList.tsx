// src/components/billing/PaymentMethodsList.tsx
'use client';

import { useState } from 'react';
import { usePaymentMethods } from '@/hooks/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AddPaymentMethodDialog } from './AddPaymentMethodDialog';
import { CreditCard, Smartphone, Bitcoin, MoreVertical, Trash2, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PaymentMethod } from '@/types/billing.types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function PaymentMethodsList() {
  const { paymentMethods, loading, error, setDefaultMethod, deleteMethod } = usePaymentMethods();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Get payment method icon
  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'CARD':
        return <CreditCard className="h-5 w-5" />;
      case 'MPESA':
        return <Smartphone className="h-5 w-5" />;
      case 'CRYPTO':
        return <Bitcoin className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  // Get card brand color
  const getCardBrandColor = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return 'text-blue-600';
    if (brandLower.includes('mastercard')) return 'text-red-600';
    if (brandLower.includes('amex')) return 'text-green-600';
    return 'text-gray-600';
  };

  // Handle set as default
  const handleSetDefault = async (method: PaymentMethod) => {
    setActionLoading(true);
    try {
      const result = await setDefaultMethod(method.id);
      if (result.success) {
        toast.success('Default payment method updated');
      } else {
        toast.error(result.error || 'Failed to update default method');
      }
    } catch  {
      toast.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedMethod) return;

    setActionLoading(true);
    try {
      const result = await deleteMethod(selectedMethod.id);
      if (result.success) {
        toast.success('Payment method deleted');
        setDeleteDialogOpen(false);
        setSelectedMethod(null);
      } else {
        toast.error(result.error || 'Failed to delete payment method');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
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
          <h2 className="text-2xl font-bold tracking-tight">Payment Methods</h2>
          <p className="text-muted-foreground">
            Manage your payment methods for subscriptions and transactions
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods Grid */}
      {paymentMethods.length === 0 ? (
        <EmptyState
          icon={< CreditCard />}
          title="No payment methods"
          description="Add a payment method to subscribe to plans and make payments"
          action={
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.is_default ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {getMethodIcon(method.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {method.type === 'CARD' && (
                        <span className={getCardBrandColor(method.card_brand)}>
                          {method.card_brand}
                        </span>
                      )}
                      {method.type === 'MPESA' && 'M-Pesa'}
                      {method.type === 'CRYPTO' && method.currency}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {method.provider}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!method.is_default && (
                      <DropdownMenuItem
                        onClick={() => handleSetDefault(method)}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Set as Default
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMethod(method);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={actionLoading || method.is_default}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Card Details */}
                {method.type === 'CARD' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Card Number</span>
                      <span className="font-mono">•••• {method.last_four}</span>
                    </div>
                    {method.expiry_month && method.expiry_year && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{method.expiry_month}/{method.expiry_year}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* M-Pesa Details */}
                {method.type === 'MPESA' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phone Number</span>
                    <span className="font-mono">{method.phone_number}</span>
                  </div>
                )}

                {/* Crypto Details */}
                {method.type === 'CRYPTO' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="uppercase font-medium">{method.currency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wallet</span>
                      <span className="font-mono text-xs truncate max-w-[150px]">
                        {method.wallet_address}
                      </span>
                    </div>
                  </div>
                )}

                {/* Default Badge */}
                {method.is_default && (
                  <Badge className="w-full justify-center" variant="default">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Default Payment Method
                  </Badge>
                )}

                {/* Added Date */}
                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Added {format(new Date(method.created_at), 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddPaymentMethodDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Payment Method"
        description={`Are you sure you want to delete ${selectedMethod?.display_info}? This action cannot be undone.`}
        confirmText="Delete"
        loading={actionLoading}
      />
    </div>
  );
}