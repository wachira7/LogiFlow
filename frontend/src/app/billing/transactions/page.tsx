// src/app/billing/transactions/page.tsx
import { TransactionList } from '@/components/billing/TransactionList';

export default function TransactionsPage() {
  return (
    <div className="p-6">
      <TransactionList />
    </div>
  );
}
