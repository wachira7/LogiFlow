// src/components/billing/AddPaymentMethodDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Smartphone, Bitcoin } from 'lucide-react';
import { StripePaymentForm } from './StripePaymentForm';
import { MPesaPaymentForm } from './MpesaPaymentForm';
import { CryptoPaymentForm } from './CryptoPaymentForm';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPaymentMethodDialog({ open, onOpenChange }: AddPaymentMethodDialogProps) {
  const [activeTab, setActiveTab] = useState('stripe');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stripe" className="flex items-center gap-2">
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

          <TabsContent value="stripe" className="space-y-4">
            <StripePaymentForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="mpesa" className="space-y-4">
            <MPesaPaymentForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4">
            <CryptoPaymentForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}