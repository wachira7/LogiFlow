// src/components/billing/MPesaPaymentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useMPesaPayment } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Smartphone, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MPesaPaymentFormProps {
  onSuccess?: () => void;
  amount?: number;
  description?: string;
}

export function MPesaPaymentForm({ 
  onSuccess, 
  amount = 0,
  description = 'LogiFlow Payment'
}: MPesaPaymentFormProps) {
  const { initiatePayment, checkStatus, loading, error: hookError, paymentResponse, reset } = useMPesaPayment();
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    amount: amount.toString(),
    description: description
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking' | 'success' | 'failed'>('idle');

  // Poll for payment status
  useEffect(() => {
    if (paymentResponse && paymentStatus === 'pending') {
      const interval = setInterval(async () => {
        const result = await checkStatus({
          checkout_request_id: paymentResponse.checkout_request_id
        });

        if (result.success) {
          const status = result?.data?.transaction_status;
          
          if (status && typeof status === 'object') {
            const resultCode = (status as Record<string, string>).ResultCode;
            
            if (resultCode === '0') {
              setPaymentStatus('success');
              toast.success('Payment completed successfully!');
              clearInterval(interval);
              onSuccess?.();
            } else if (resultCode) {
              setPaymentStatus('failed');
              toast.error('Payment failed');
              clearInterval(interval);
            }
          }
        }
      }, 5000); // Check every 5 seconds

      // Stop checking after 2 minutes
      setTimeout(() => {
        clearInterval(interval);
        if (paymentStatus === 'pending') {
          setPaymentStatus('failed');
          toast.error('Payment timeout - please try again');
        }
      }, 120000);

      return () => clearInterval(interval);
    }
  }, [paymentResponse, paymentStatus, checkStatus, onSuccess]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Phone number validation (Kenyan format)
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid M-Pesa number (e.g., 254712345678 or 0712345678)';
    }

    if (amount === 0 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    if (field === 'phoneNumber') {
      const cleaned = value.replace(/\D/g, '');
      setFormData({ ...formData, [field]: cleaned });
    } else {
      setFormData({ ...formData, [field]: value });
    }
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const paymentAmount = amount > 0 ? amount : parseFloat(formData.amount);

    setPaymentStatus('pending');
    const result = await initiatePayment({
      phone_number: formData.phoneNumber,
      amount: paymentAmount,
      description: formData.description,
    });

    if (result.success) {
      toast.success('STK Push sent!', {
        description: 'Check your phone and enter your M-Pesa PIN'
      });
    } else {
      setPaymentStatus('failed');
      toast.error(result.error || 'Payment initiation failed');
    }
  };

  // Reset form
  const handleReset = () => {
    reset();
    setPaymentStatus('idle');
    setFormData({
      phoneNumber: '',
      amount: amount.toString(),
      description: description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Enter your M-Pesa number to receive an STK Push prompt on your phone.
        </AlertDescription>
      </Alert>

      {/* Payment Status */}
      {paymentStatus === 'pending' && (
        <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900 dark:text-yellow-100">
            <strong>Waiting for payment...</strong>
            <p className="mt-1">Check your phone and enter your M-Pesa PIN to complete the payment.</p>
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'success' && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            <strong>Payment successful!</strong>
            <p className="mt-1">Your M-Pesa payment has been completed.</p>
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'failed' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment failed</strong>
            <p className="mt-1">Please try again or use a different payment method.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      {paymentStatus === 'idle' && (
        <>
          {/* Amount (if not pre-filled) */}
          {amount === 0 && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="1"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
          )}

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="254712345678 or 0712345678"
              maxLength={12}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-600">{errors.phoneNumber}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter your Safaricom M-Pesa number
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
                Sending STK Push...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Pay {amount > 0 ? `KES ${amount}` : formData.amount ? `KES ${formData.amount}` : ''}
              </>
            )}
          </Button>
        </>
      )}

      {/* Retry Button */}
      {(paymentStatus === 'failed' || paymentStatus === 'success') && (
        <Button type="button" onClick={handleReset} className="w-full" variant="outline">
          Make Another Payment
        </Button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Powered by Safaricom M-Pesa
      </p>
    </form>
  );
}