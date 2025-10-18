// src/components/billing/CryptoPaymentForm.tsx

'use client';

import { useState } from 'react';
import { useCryptoPayment } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bitcoin, AlertTriangle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CryptoPaymentFormProps {
  onSuccess?: () => void;
  amount?: number;
  currency?: string;
  description?: string;
}

export function CryptoPaymentForm({ 
  onSuccess, 
  amount = 0,
  currency = 'USD',
  description = 'LogiFlow crypto payment'
}: CryptoPaymentFormProps) {
  const { createPayment, loading, error: hookError, paymentResponse, reset } = useCryptoPayment();
  
  const [formData, setFormData] = useState({
    amount: amount.toString(),
    currency: currency,
    payCurrency: 'auto', // ✅ FIX: Use 'auto' instead of empty string
    description: description
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentCreated, setPaymentCreated] = useState(false);

  // Supported cryptocurrencies
  const cryptoCurrencies = [
    { value: 'btc', label: 'Bitcoin (BTC)' },
    { value: 'eth', label: 'Ethereum (ETH)' },
    { value: 'usdt', label: 'Tether (USDT)' },
    { value: 'usdc', label: 'USD Coin (USDC)' },
    { value: 'bnb', label: 'Binance Coin (BNB)' },
    { value: 'ltc', label: 'Litecoin (LTC)' },
    { value: 'doge', label: 'Dogecoin (DOGE)' },
    { value: 'xrp', label: 'XRP (XRP)' },
    { value: 'ada', label: 'Cardano (ADA)' },
    { value: 'sol', label: 'Solana (SOL)' },
    { value: 'matic', label: 'Polygon (MATIC)' },
    { value: 'dot', label: 'Polkadot (DOT)' },
    { value: 'avax', label: 'Avalanche (AVAX)' },
  ];

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (amount === 0 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const paymentAmount = amount > 0 ? amount : parseFloat(formData.amount);

    const result = await createPayment({
      amount: paymentAmount,
      currency: formData.currency,
      // ✅ FIX: Convert 'auto' to undefined
      pay_currency: formData.payCurrency === 'auto' ? undefined : formData.payCurrency,
      order_description: formData.description,
    });

    if (result.success) {
      setPaymentCreated(true);
      toast.success('Payment created successfully!', {
        description: 'Send crypto to the address below'
      });
    } else {
      toast.error(result.error || 'Payment creation failed');
    }
  };

  // Reset form
  const handleReset = () => {
    reset();
    setPaymentCreated(false);
    setFormData({
      amount: amount.toString(),
      currency: currency,
      payCurrency: 'auto', // ✅ FIX: Reset to 'auto'
      description: description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Bitcoin className="h-4 w-4" />
        <AlertDescription>
          Pay with cryptocurrency via NOWPayments. Choose your preferred crypto.
        </AlertDescription>
      </Alert>

      {/* Payment Created - Show Details */}
      {paymentCreated && paymentResponse ? (
        <div className="space-y-4">
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <strong>Payment created!</strong>
              <p className="mt-1">Send {paymentResponse.pay_currency?.toUpperCase()} to the address below.</p>
            </AlertDescription>
          </Alert>

          {/* Payment Details */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Amount to Pay</Label>
              <div className="flex items-center justify-between p-3 bg-background rounded border">
                <span className="font-mono font-bold text-lg">
                  {paymentResponse.pay_amount} {paymentResponse.pay_currency?.toUpperCase()}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentResponse.pay_amount, 'Amount')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payment Address</Label>
              <div className="flex items-center justify-between p-3 bg-background rounded border">
                <span className="font-mono text-sm truncate flex-1">
                  {paymentResponse.payment_address}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentResponse.payment_address, 'Address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {paymentResponse.payment_url && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <a
                  href={paymentResponse.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Payment Page
                </a>
              </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Send the exact amount shown above</p>
              <p>• Payment ID: {paymentResponse.payment_id}</p>
              {paymentResponse.expires_at && (
                <p>• Expires: {new Date(paymentResponse.expires_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Send only {paymentResponse.pay_currency?.toUpperCase()} to this address. 
              Sending other cryptocurrencies may result in permanent loss of funds.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                onSuccess?.();
                handleReset();
              }}
              className="flex-1"
            >
              Done
            </Button>
            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              className="flex-1"
            >
              New Payment
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Form Fields */}
          {/* Amount (if not pre-filled) */}
          {amount === 0 && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({formData.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
          )}

          {/* Cryptocurrency Selection */}
          <div className="space-y-2">
            <Label htmlFor="payCurrency">Cryptocurrency (Optional)</Label>
            <Select
              value={formData.payCurrency}
              onValueChange={(value) => handleChange('payCurrency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-select cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {/* Use 'auto' instead of empty string */}
                <SelectItem value="auto">Auto-select</SelectItem>
                {cryptoCurrencies.map((crypto) => (
                  <SelectItem key={crypto.value} value={crypto.value}>
                    {crypto.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave as auto-select to let the user choose on the payment page
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Payment for..."
            />
          </div>

          {/* Error Display */}
          {hookError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{hookError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating Payment...
              </>
            ) : (
              <>
                <Bitcoin className="h-4 w-4 mr-2" />
                Create Crypto Payment
              </>
            )}
          </Button>

          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>Powered by NOWPayments</p>
            <p>Supporting 300+ cryptocurrencies</p>
          </div>
        </>
      )}
    </form>
  );
}