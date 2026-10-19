//src/app/billing/subscriptions/page.tsx
'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { billingService } from '@/services/billingService'
import { useSubscriptions } from '@/hooks/useBilling'
import { SubscriptionSummaryCard } from '@/components/billing/SubscriptionSummaryCard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ArrowLeft, CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

function SubscriptionsContent() {
  const { subscriptions, loading, error, refetch } = useSubscriptions()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')

    if (checkout === 'success' && sessionId) {
      const processSuccess = async () => {
        const response = await billingService.handleStripeCheckoutSuccess({
          session_id: sessionId,
        })

        if (response.success) {
          toast.success('Subscription activated!', {
            description: `You are now on the ${response.data.plan_name} plan`,
          })
          refetch()
        } else {
          toast.error('Failed to activate subscription', {
            description: response.error,
          })
        }
      }

      processSuccess()
      window.history.replaceState({}, '', '/billing/subscriptions')
    }

    if (checkout === 'cancelled') {
      toast.info('Checkout cancelled')
      window.history.replaceState({}, '', '/billing/subscriptions')
    }
  }, [searchParams, refetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/billing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">My Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your active and past subscriptions
          </p>
        </div>
        <Button asChild>
          <Link href="/billing/plans">
            <CreditCard className="h-4 w-4 mr-2" />
            Browse Plans
          </Link>
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" />}
          title="No subscriptions"
          description="You don't have any subscriptions yet. Browse our plans to get started."
          action={
            <Button asChild>
              <Link href="/billing/plans">Browse Plans</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((subscription) => (
            <SubscriptionSummaryCard
              key={subscription.id}
              subscription={subscription}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SubscriptionsContent />
    </Suspense>
  )
}