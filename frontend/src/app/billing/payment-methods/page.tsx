// src/app/billing/payment-methods/page.tsx
import { PaymentMethodsList } from '@/components/billing/PaymentMethodsList';

export default function PaymentMethodsPage() {
  return (
    <div className="p-6">
      <PaymentMethodsList />
    </div>
  );
}
