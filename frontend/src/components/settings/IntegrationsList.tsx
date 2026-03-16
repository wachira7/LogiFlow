'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Smartphone, Bitcoin, ExternalLink, AlertCircle, Settings, RefreshCw, Loader2 } from 'lucide-react'
import { SettingsCard } from './SettingsCard'
import { api } from '@/services/api'

type IntegrationStatusType = 'active' | 'inactive' | 'error'

interface IntegrationState {
  connected: boolean
  status: IntegrationStatusType
  message: string | undefined
}

interface IntegrationsState {
  stripe: IntegrationState
  mpesa: IntegrationState
  crypto: IntegrationState
}

interface TestingState {
  stripe: boolean
  mpesa: boolean
  crypto: boolean
}

interface TestConnectionResponse {
  test_passed: boolean
  message: string
}

interface IntegrationCardProps {
  icon: React.ReactNode
  title: string
  description: string
  status: IntegrationStatusType
  connected?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onConfigure?: () => void
  onTest?: () => void
  testing?: boolean
}

function IntegrationCard({
  icon,
  title,
  description,
  status,
  connected,
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
  testing,
}: IntegrationCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
              <div className="flex items-center space-x-2 mt-3">
                {getStatusBadge()}
                {connected && (
                  <span className="text-xs text-muted-foreground">Connected</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onTest && (
              <Button variant="outline" size="sm" onClick={onTest} disabled={testing}>
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            )}
            {connected ? (
              <>
                {onConfigure && (
                  <Button variant="outline" size="sm" onClick={onConfigure}>
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
                {onDisconnect && (
                  <Button variant="outline" size="sm" onClick={onDisconnect}>
                    Disconnect
                  </Button>
                )}
              </>
            ) : (
              onConnect && (
                <Button variant="outline" size="sm" onClick={onConnect}>
                  Connect
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function IntegrationsList() {
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    stripe: { connected: true, status: 'active', message: 'Configured via platform settings' },
    mpesa: { connected: true, status: 'active', message: 'Configured via platform settings' },
    crypto: { connected: true, status: 'active', message: 'Configured via platform settings' },
  })

  const [testing, setTesting] = useState<TestingState>({
    stripe: false,
    mpesa: false,
    crypto: false,
  })

  const testStripeConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, stripe: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-stripe/')
      if (!response.data) throw new Error('No response data')
      setIntegrations(prev => ({
        ...prev,
        stripe: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message,
        },
      }))
    } catch (error) {
      setIntegrations(prev => ({
        ...prev,
        stripe: {
          connected: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }))
    } finally {
      setTesting(prev => ({ ...prev, stripe: false }))
    }
  }, [])

  const testMPesaConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, mpesa: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-mpesa/')
      if (!response.data) throw new Error('No response data')
      setIntegrations(prev => ({
        ...prev,
        mpesa: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message,
        },
      }))
    } catch (error) {
      setIntegrations(prev => ({
        ...prev,
        mpesa: {
          connected: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }))
    } finally {
      setTesting(prev => ({ ...prev, mpesa: false }))
    }
  }, [])

  const testCryptoConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, crypto: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-crypto/')
      if (!response.data) throw new Error('No response data')
      setIntegrations(prev => ({
        ...prev,
        crypto: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message,
        },
      }))
    } catch (error) {
      setIntegrations(prev => ({
        ...prev,
        crypto: {
          connected: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }))
    } finally {
      setTesting(prev => ({ ...prev, crypto: false }))
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Payment integrations are configured at the platform level. 
          Contact your administrator for integration status.
        </AlertDescription>
      </Alert>

      {/* Payment Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Payment Integrations</h2>
        <div className="space-y-4">
          <IntegrationCard
            icon={<CreditCard className="w-6 h-6 text-primary" />}
            title="Stripe"
            description={integrations.stripe.message || 'Accept credit card payments and manage subscriptions'}
            status={integrations.stripe.status}
            connected={integrations.stripe.connected}
            onTest={testStripeConnection}
            testing={testing.stripe}
            onConfigure={() => {}}
            onDisconnect={() => {}}
          />
          <IntegrationCard
            icon={<Smartphone className="w-6 h-6 text-primary" />}
            title="M-Pesa"
            description={integrations.mpesa.message || 'Accept mobile money payments from M-Pesa users'}
            status={integrations.mpesa.status}
            connected={integrations.mpesa.connected}
            onTest={testMPesaConnection}
            testing={testing.mpesa}
          />
          <IntegrationCard
            icon={<Bitcoin className="w-6 h-6 text-primary" />}
            title="Cryptocurrency"
            description={integrations.crypto.message || 'Accept Bitcoin, Ethereum, and other cryptocurrencies'}
            status={integrations.crypto.status}
            connected={integrations.crypto.connected}
            onTest={testCryptoConnection}
            testing={testing.crypto}
          />
        </div>
      </div>

      <Separator />

      {/* Third-Party Integrations */}
      <SettingsCard
        title="Third-Party Integrations"
        description="Connect with external services and tools"
        icon={ExternalLink}
      >
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Additional integrations coming soon! We&apos;re working on connections 
              with Shopify, QuickBooks, and more.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="opacity-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Shopify</CardTitle>
                <CardDescription>Sync orders and inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>Coming Soon</Button>
              </CardContent>
            </Card>

            <Card className="opacity-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">QuickBooks</CardTitle>
                <CardDescription>Sync financial data</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>Coming Soon</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}