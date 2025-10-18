// src/app/billing/subscriptions/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SubscriptionDetail } from '@/components/billing/SubscriptionDetail';
import { useSubscriptions } from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { UserSubscriptionDetail } from '@/types/billing.types';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const subscriptionId = params.id as string;
  const { getSubscriptionById } = useSubscriptions();
  
  const [subscription, setSubscription] = useState<UserSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      setError(null);
      
      const result = await getSubscriptionById(subscriptionId);
      
      if (result) {
        setSubscription(result);
      } else {
        setError('Subscription not found');
      }
      
      setLoading(false);
    };

    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId, getSubscriptionById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load subscription details'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SubscriptionDetail subscription={subscription} />
    </div>
  );
}