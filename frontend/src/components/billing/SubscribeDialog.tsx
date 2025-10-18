// src/components/billing/SubscribeDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscriptions, usePaymentMethods, useSubscriptionPlans } from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CreditCard, Smartphone, Bitcoin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { PaymentProvider, SubscriptionPlan } from '@/types/billing.types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  onSuccess?: () => void;
}

export function SubscribeDialog({ open, onOpenChange, planId, onSuccess }: SubscribeDialogProps) {
  const router = useRouter();
  const { createSubscription } = useSubscriptions();
  const { paymentMethods } = usePaymentMethods();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('STRIPE');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(''); // ✅ FIX: Use empty string consistently
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the selected plan
  const plan = plans.find((p: SubscriptionPlan) => p.id === planId) || null;

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedProvider('STRIPE');
      setSelectedPaymentMethod(''); // ✅ FIX: Reset to empty string
      setAutoRenew(true);
      setError(null);
    }
  }, [open]);

  if (!planId || !plan) {
    if (open && !plansLoading) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Plan Not Found</DialogTitle>
              <DialogDescription>
                The selected plan could not be loaded.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    return null;
  }

  // Filter payment methods by provider
  const availablePaymentMethods = paymentMethods.filter(
    (method) => method.provider === selectedProvider
  );

  // Get provider icon
  const getProviderIcon = (provider: PaymentProvider) => {
    switch (provider) {
      case 'STRIPE':
        return <CreditCard className="h-5 w-5" />;
      case 'MPESA':
        return <Smartphone className="h-5 w-5" />;
      case 'CRYPTO':
        return <Bitcoin className="h-5 w-5" />;
    }
  };

  // Handle subscription
  const handleSubscribe = async () => {
    if (!plan) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createSubscription({
        plan_id: plan.id,
        payment_provider: selectedProvider,
        payment_method_id: selectedPaymentMethod || undefined, // ✅ FIX: Convert empty string to undefined
        auto_renew: autoRenew,
      });

      if (result.success) {
        toast.success('Subscription created successfully!', {
          description: `You are now subscribed to ${plan.name}`,
        });
        onOpenChange(false);
        onSuccess?.();
        router.push('/billing/subscriptions');
      } else {
        setError(result.error || 'Failed to create subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
          <DialogDescription>
            Complete your subscription setup
          </DialogDescription>
        </DialogHeader>

        {plansLoading ? (
          <div className="py-8 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Plan Summary */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{plan.name}</span>
                <span className="text-2xl font-bold">${plan.price}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Billed {plan.billing_cycle.toLowerCase()}
              </p>
              <div className="pt-2 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Users:</span>
                  <span>{plan.max_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouses:</span>
                  <span>{plan.max_warehouses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products:</span>
                  <span>{plan.max_products.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Provider Selection */}
            <div className="space-y-3">
              <Label>Payment Provider</Label>
              <RadioGroup value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as PaymentProvider)}>
                <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="STRIPE" id="stripe" />
                  <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getProviderIcon('STRIPE')}
                    <span>Credit/Debit Card (Stripe)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="MPESA" id="mpesa" />
                  <Label htmlFor="mpesa" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getProviderIcon('MPESA')}
                    <span>M-Pesa</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="CRYPTO" id="crypto" />
                  <Label htmlFor="crypto" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getProviderIcon('CRYPTO')}
                    <span>Cryptocurrency</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Saved Payment Methods */}
            {availablePaymentMethods.length > 0 && (
              <div className="space-y-3">
                <Label>Saved Payment Methods (Optional)</Label>
                <RadioGroup 
                  value={selectedPaymentMethod} 
                  onValueChange={setSelectedPaymentMethod}
                >
                  {/* ✅ FIX: Add "None" option to allow deselection */}
                  <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="" id="none" />
                    <Label htmlFor="none" className="cursor-pointer flex-1">
                      <span className="text-sm text-muted-foreground">Use new payment method</span>
                    </Label>
                  </div>
                  {availablePaymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer flex-1">
                        {method.display_info}
                        {method.is_default && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Auto-renew Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-renew" className="font-medium">
                  Auto-renew subscription
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically renew when the period ends
                </p>
              </div>
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
              />
            </div>

            {/* Trial Notice */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>14-day free trial</strong> - You won&apos;t be charged until the trial ends.
              </AlertDescription>
            </Alert>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe} disabled={loading || plansLoading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              'Start Free Trial'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}