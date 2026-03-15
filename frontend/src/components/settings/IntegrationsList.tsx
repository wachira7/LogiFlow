// components/settings/IntegrationsList.tsx 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreditCard, Smartphone, Bitcoin, Key, Webhook, ExternalLink, Copy, CheckCircle2, AlertCircle, Settings, Trash2, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { SettingsCard } from './SettingsCard'
import { api } from '@/services/api'

// Proper type definitions
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

// ✅ API Response types
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
                  <span className="text-xs text-muted-foreground">
                    Connected
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onTest && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onTest}
                disabled={testing}
              >
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showCreateAPIKey, setShowCreateAPIKey] = useState(false)
  const [apiKeyName, setApiKeyName] = useState('')
  
  // ✅ Properly typed state
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    stripe: { connected: false, status: 'active', message: 'Configured via platform settings' },
    mpesa: { connected: false, status: 'active', message: 'Configured via platform settings' },
    crypto: { connected: false, status: 'active', message: 'Configured via platform settings' },
  })
  
  const [testing, setTesting] = useState<TestingState>({
    stripe: false,
    mpesa: false,
    crypto: false,
  })
  
  const [loading, setLoading] = useState(true)

  const testStripeConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, stripe: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-stripe/')
      
      if (!response.data) {
        throw new Error('No response data')
      }
      
      setIntegrations(prev => ({
        ...prev,
        stripe: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message
        }
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      setIntegrations(prev => ({
        ...prev,
        stripe: {
          connected: false,
          status: 'error',
          message: errorMessage
        }
      }))
    } finally {
      setTesting(prev => ({ ...prev, stripe: false }))
    }
  }, [])

  const testMPesaConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, mpesa: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-mpesa/')
      
      if (!response.data) {
        throw new Error('No response data')
      }
      
      setIntegrations(prev => ({
        ...prev,
        mpesa: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message
        }
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      setIntegrations(prev => ({
        ...prev,
        mpesa: {
          connected: false,
          status: 'error',
          message: errorMessage
        }
      }))
    } finally {
      setTesting(prev => ({ ...prev, mpesa: false }))
    }
  }, [])

  const testCryptoConnection = useCallback(async () => {
    setTesting(prev => ({ ...prev, crypto: true }))
    try {
      const response = await api.get<TestConnectionResponse>('/api/v1/payments/test-crypto/')
      
      if (!response.data) {
        throw new Error('No response data')
      }
      
      setIntegrations(prev => ({
        ...prev,
        crypto: {
          connected: response.data?.test_passed ?? false,
          status: response.data?.test_passed ? 'active' : 'error',
          message: response.data?.message
        }
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      setIntegrations(prev => ({
        ...prev,
        crypto: {
          connected: false,
          status: 'error',
          message: errorMessage
        }
      }))
    } finally {
      setTesting(prev => ({ ...prev, crypto: false }))
    }
  }, [])

  // ✅ Memoized function to prevent dependency warning
  const checkAllIntegrations = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      testStripeConnection(),
      testMPesaConnection(),
      testCryptoConnection(),
    ])
    setLoading(false)
  }, [testStripeConnection, testMPesaConnection, testCryptoConnection])

  // ✅ Now checkAllIntegrations is stable and can be in dependency array
  useEffect(() => {
    checkAllIntegrations()
  }, [checkAllIntegrations])

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleCreateAPIKey = () => {
    // Implement API key creation
    console.log('Creating API key:', apiKeyName)
    setShowCreateAPIKey(false)
    setApiKeyName('')
  }

  // Mock API keys - replace with actual data
  const [apiKeys] = useState([
    {
      id: '1',
      name: 'Production API Key',
      key: 'sk_live_51H...',
      created_at: '2025-01-15T10:00:00Z',
      last_used: '2025-11-04T08:30:00Z',
      status: 'active' as const,
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'sk_test_51H...',
      created_at: '2025-01-10T14:00:00Z',
      last_used: '2025-11-03T16:45:00Z',
      status: 'active' as const,
    },
  ])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Integration status is checked automatically. Click the refresh button to test connection manually.
        </AlertDescription>
      </Alert>

      {/* Payment Integrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Payment Integrations</h2>
          <Button variant="outline" size="sm" onClick={checkAllIntegrations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Test All
          </Button>
        </div>
        
        <div className="space-y-4">
          <IntegrationCard
            icon={<CreditCard className="w-6 h-6 text-primary" />}
            title="Stripe"
            description={integrations.stripe.message || "Accept credit card payments and manage subscriptions"}
            status={integrations.stripe.status}
            connected={integrations.stripe.connected}
            onTest={testStripeConnection}
            testing={testing.stripe}
            onConfigure={() => console.log('Configure Stripe')}
            onDisconnect={() => console.log('Disconnect Stripe')}
          />

          <IntegrationCard
            icon={<Smartphone className="w-6 h-6 text-primary" />}
            title="M-Pesa"
            description={integrations.mpesa.message || "Accept mobile money payments from M-Pesa users"}
            status={integrations.mpesa.status}
            connected={integrations.mpesa.connected}
            onTest={testMPesaConnection}
            testing={testing.mpesa}
            onConnect={() => console.log('Connect M-Pesa')}
          />

          <IntegrationCard
            icon={<Bitcoin className="w-6 h-6 text-primary" />}
            title="Cryptocurrency"
            description={integrations.crypto.message || "Accept Bitcoin, Ethereum, and other cryptocurrencies"}
            status={integrations.crypto.status}
            connected={integrations.crypto.connected}
            onTest={testCryptoConnection}
            testing={testing.crypto}
            onConnect={() => console.log('Connect Crypto')}
          />
        </div>
      </div>

      <Separator />

      {/* API Keys Section */}
      <SettingsCard
        title="API Keys"
        description="Manage your API keys for programmatic access"
        icon={Key}
        action={
          <Dialog open={showCreateAPIKey} onOpenChange={setShowCreateAPIKey}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for accessing LogiFlow APIs
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., Production Key"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure to copy your API key after creation. You won&apos;t be able to see it again.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateAPIKey(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAPIKey} disabled={!apiKeyName}>
                  Create Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{apiKey.name}</h4>
                  <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                    {apiKey.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {apiKey.key}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                  >
                    {copiedKey === apiKey.id ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(apiKey.created_at).toLocaleDateString()} • 
                  Last used: {new Date(apiKey.last_used).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-muted p-4 rounded-lg mt-4">
          <p className="text-sm text-muted-foreground">
            📚 View our <a href="#" className="text-primary hover:underline">API Documentation</a> to learn how to integrate with LogiFlow.
          </p>
        </div>
      </SettingsCard>

      {/* Webhooks */}
      <SettingsCard
        title="Webhooks"
        description="Configure webhooks to receive real-time updates"
        icon={Webhook}
        action={
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        }
      >
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No webhooks configured yet. Add a webhook to receive real-time notifications about events in your account.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Available Events:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• order.created, order.updated, order.completed</li>
              <li>• shipment.created, shipment.dispatched, shipment.delivered</li>
              <li>• inventory.low_stock, inventory.out_of_stock</li>
              <li>• payment.succeeded, payment.failed</li>
            </ul>
          </div>
        </div>
      </SettingsCard>

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
              Additional integrations coming soon! We&apos;re working on connections with Shopify, QuickBooks, and more.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="opacity-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Shopify</CardTitle>
                <CardDescription>Sync orders and inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="opacity-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">QuickBooks</CardTitle>
                <CardDescription>Sync financial data</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}