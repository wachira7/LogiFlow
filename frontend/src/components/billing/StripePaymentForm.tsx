// src/components/billing/StripePaymentForm.tsx
'use client';

import { useStripeCheckout } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

interface StripePaymentFormProps {
  planId: string;
  planName?: string;
  amount?: number;
  currency?: string;
}

export function StripePaymentForm({
  planId,
  planName,
  amount,
  currency = 'USD',
}: StripePaymentFormProps) {
  const { initiateCheckout, loading, error } = useStripeCheckout();

  const handleCheckout = async () => {
    await initiateCheckout(planId);
    // If successful, user is redirected to Stripe 
  };

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          You will be redirected to Stripe&apos;s secure checkout page to complete your payment.
          Your card details are handled entirely by Stripe.
        </AlertDescription>
      </Alert>

      {amount !== undefined && (
        <div className="rounded-lg border p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-bold text-lg">
              {currency} {amount.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Includes 14-day free trial — no charge until trial ends
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay with Card
            <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Secured by{' '}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          Stripe
        </a>
        . We never store your card details.
      </p>
    </div>
  );
}