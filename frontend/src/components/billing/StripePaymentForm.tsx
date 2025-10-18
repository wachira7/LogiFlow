// src/components/billing/StripePaymentForm.tsx
'use client';

import { useState } from 'react';
import { useStripePayment } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentFormProps {
  onSuccess?: () => void;
  amount?: number;
  currency?: string;
  description?: string;
}

export function StripePaymentForm({ 
  onSuccess, 
  amount = 0, 
  currency = 'USD',
  description = 'Payment'
}: StripePaymentFormProps) {
  const { initiatePayment, loading, error: hookError } = useStripePayment();
  
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    amount: amount.toString(),
    description: description
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    if (!formData.expiryMonth || parseInt(formData.expiryMonth) < 1 || parseInt(formData.expiryMonth) > 12) {
      newErrors.expiryMonth = 'Invalid month';
    }

    const currentYear = new Date().getFullYear();
    if (!formData.expiryYear || parseInt(formData.expiryYear) < currentYear) {
      newErrors.expiryYear = 'Invalid year';
    }

    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'Invalid CVV';
    }

    if (amount === 0 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Format card number
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    if (field === 'cardNumber') {
      const cleaned = value.replace(/\D/g, '').slice(0, 16);
      setFormData({ ...formData, [field]: formatCardNumber(cleaned) });
    } else if (field === 'cvv') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData({ ...formData, [field]: cleaned });
    } else if (field === 'expiryMonth' || field === 'expiryYear') {
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

    const result = await initiatePayment({
      amount: paymentAmount,
      currency: currency,
      description: formData.description,
    });

    if (result.success) {
      toast.success('Payment initiated successfully!');
      onSuccess?.();
    } else {
      toast.error(result.error || 'Payment failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          Your payment is secured by Stripe. Card details are encrypted.
        </AlertDescription>
      </Alert>

      {/* Amount (if not pre-filled) */}
      {amount === 0 && (
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({currency})</Label>
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

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <Input
          id="cardNumber"
          value={formData.cardNumber}
          onChange={(e) => handleChange('cardNumber', e.target.value)}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
        />
        {errors.cardNumber && (
          <p className="text-sm text-red-600">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          value={formData.cardholderName}
          onChange={(e) => handleChange('cardholderName', e.target.value)}
          placeholder="John Doe"
        />
        {errors.cardholderName && (
          <p className="text-sm text-red-600">{errors.cardholderName}</p>
        )}
      </div>

      {/* Expiry & CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryMonth">Month</Label>
          <Input
            id="expiryMonth"
            value={formData.expiryMonth}
            onChange={(e) => handleChange('expiryMonth', e.target.value)}
            placeholder="MM"
            maxLength={2}
          />
          {errors.expiryMonth && (
            <p className="text-sm text-red-600">{errors.expiryMonth}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryYear">Year</Label>
          <Input
            id="expiryYear"
            value={formData.expiryYear}
            onChange={(e) => handleChange('expiryYear', e.target.value)}
            placeholder="YYYY"
            maxLength={4}
          />
          {errors.expiryYear && (
            <p className="text-sm text-red-600">{errors.expiryYear}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            value={formData.cvv}
            onChange={(e) => handleChange('cvv', e.target.value)}
            placeholder="123"
            maxLength={4}
          />
          {errors.cvv && (
            <p className="text-sm text-red-600">{errors.cvv}</p>
          )}
        </div>
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
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay {amount > 0 ? `$${amount.toFixed(2)}` : formData.amount ? `$${parseFloat(formData.amount).toFixed(2)}` : ''}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By proceeding, you agree to our terms and conditions
      </p>
    </form>
  );
}