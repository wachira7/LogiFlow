// src/components/billing/AddPaymentMethodDialog.tsx
// - Card (Stripe): redirects to Stripe Checkout in setup mode; M-Pesa: saves phone number;Crypto: saves wallet address

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CreditCard, Smartphone, Bitcoin, ShieldCheck, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodDialogProps) {
  const [activeTab, setActiveTab] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // M-Pesa form state
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaPhoneError, setMpesaPhoneError] = useState('');

  // Crypto form state
  const [cryptoCurrency, setCryptoCurrency] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [cryptoErrors, setCryptoErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setError(null);
    setMpesaPhone('');
    setMpesaPhoneError('');
    setCryptoCurrency('');
    setWalletAddress('');
    setCryptoErrors({});
    onOpenChange(false);
  };

  // ── Card: Stripe Setup Mode Checkout ──────────────────────────────────────
  const handleAddCard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create a Stripe Checkout in setup mode to save card without charging
      const response = await api.post<{ checkout_url: string }>(
        '/api/v1/payments/stripe/setup/',
        {
          success_url: `${window.location.origin}/billing/payment-methods?setup=success`,
          cancel_url: `${window.location.origin}/billing/payment-methods?setup=cancelled`,
        }
      );

      if (response.success && response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        setError(response.error || 'Failed to start card setup');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  // M-Pesa: Save phone number 
  const handleAddMpesa = async () => {
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    const cleaned = mpesaPhone.replace(/\s/g, '');

    if (!cleaned || !phoneRegex.test(cleaned)) {
      setMpesaPhoneError('Enter a valid M-Pesa number (e.g. 254712345678 or 0712345678)');
      return;
    }

    setMpesaPhoneError('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/v1/payments/payment-methods/', {
        type: 'MPESA',
        provider: 'MPESA',
        phone_number: cleaned,
      });

      if (response.success) {
        toast.success('M-Pesa number saved successfully');
        onSuccess?.();
        handleClose();
      } else {
        setError(response.error || 'Failed to save M-Pesa number');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Crypto: Save wallet address
  const handleAddCrypto = async () => {
    const newErrors: Record<string, string> = {};

    if (!cryptoCurrency.trim()) {
      newErrors.currency = 'Select a cryptocurrency';
    }
    if (!walletAddress.trim()) {
      newErrors.wallet = 'Wallet address is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setCryptoErrors(newErrors);
      return;
    }

    setCryptoErrors({});
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/v1/payments/payment-methods/', {
        type: 'CRYPTO',
        provider: 'CRYPTO',
        currency: cryptoCurrency.toLowerCase(),
        wallet_address: walletAddress.trim(),
      });

      if (response.success) {
        toast.success('Crypto wallet saved successfully');
        onSuccess?.();
        handleClose();
      } else {
        setError(response.error || 'Failed to save wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const cryptoCurrencies = [
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB',
    'LTC', 'DOGE', 'XRP', 'ADA', 'SOL',
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Save a payment method for future subscriptions and billing
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
            </TabsTrigger>
            <TabsTrigger value="mpesa" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">M-Pesa</span>
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4" />
              <span className="hidden sm:inline">Crypto</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Card Tab ── */}
          <TabsContent value="card" className="space-y-4 pt-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                You will be redirected to Stripe&apos;s secure page to save your card.
                We never store card details.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleAddCard}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Card via Stripe
                  <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* ── M-Pesa Tab ── */}
          <TabsContent value="mpesa" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
              <Input
                id="mpesa-phone"
                value={mpesaPhone}
                onChange={(e) => {
                  setMpesaPhone(e.target.value.replace(/\D/g, ''));
                  setMpesaPhoneError('');
                }}
                placeholder="254712345678 or 0712345678"
                maxLength={12}
              />
              {mpesaPhoneError && (
                <p className="text-sm text-red-600">{mpesaPhoneError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter your Safaricom M-Pesa number
              </p>
            </div>
          </TabsContent>

          {/* ── Crypto Tab ── */}
          <TabsContent value="crypto" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="crypto-currency">Cryptocurrency</Label>
              <select
                id="crypto-currency"
                value={cryptoCurrency}
                onChange={(e) => {
                  setCryptoCurrency(e.target.value);
                  setCryptoErrors({ ...cryptoErrors, currency: '' });
                }}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select cryptocurrency</option>
                {cryptoCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {cryptoErrors.currency && (
                <p className="text-sm text-red-600">{cryptoErrors.currency}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setCryptoErrors({ ...cryptoErrors, wallet: '' });
                }}
                placeholder="Your wallet address"
              />
              {cryptoErrors.wallet && (
                <p className="text-sm text-red-600">{cryptoErrors.wallet}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {activeTab === 'mpesa' && (
            <Button onClick={handleAddMpesa} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Save M-Pesa Number
            </Button>
          )}
          {activeTab === 'crypto' && (
            <Button onClick={handleAddCrypto} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Save Wallet
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}