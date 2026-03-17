//src/app/auth/accept-invitation/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Building2 } from 'lucide-react'
import Image from 'next/image'

interface InvitationDetails {
  email: string
  company_name: string
  role: string
  invited_by_name: string
  expires_at: string
  is_expired: boolean
}

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    password_confirm: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token found. Please check your invitation link.')
      setIsLoadingToken(false)
      return
    }

    const validateToken = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tenants/invitations/validate/?token=${token}`
        )
        const data = await response.json()

        if (!response.ok) {
          setTokenError(data.error || 'Invalid or expired invitation.')
        } else {
          setInvitation(data)
        }
      } catch {
        // If validate endpoint doesn't exist yet, just proceed with the form
        setInvitation(null)
      } finally {
        setIsLoadingToken(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.password_confirm) {
        setError('Passwords do not match.')
        return
    }

    if (formData.password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
    }

    setIsSubmitting(true)

    try {
        const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tenants/invitations/accept/`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            token,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number,
            password: formData.password,
            password_confirm: formData.password_confirm,
            }),
        }
        )

        const data = await response.json()

        if (!response.ok) {
        setError(data.error || data.detail || 'Failed to accept invitation.')
        return
        }

        setSuccess(true)
        setTimeout(() => router.push('/auth/login'), 3000)

    } catch {
        setError('Something went wrong. Please try again.')
    } finally {
        setIsSubmitting(false)
    }
    }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: '', color: '' }
    if (password.length < 6) return { strength: 'Weak', color: 'text-red-600' }
    if (password.length < 10) return { strength: 'Medium', color: 'text-yellow-600' }
    return { strength: 'Strong', color: 'text-green-600' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // Loading token
  if (isLoadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{tokenError}</p>
            <Button asChild variant="outline">
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Welcome to the team!</h2>
            <p className="text-muted-foreground mb-2">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to login...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="relative w-10 h-10">
              <Image
                src="/logiflow-logo.png"
                alt="LogiFlow"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl">LogiFlow</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              {invitation ? (
                <>
                  <strong>{invitation.invited_by_name}</strong> has invited you to join{' '}
                  <strong>{invitation.company_name}</strong> as{' '}
                  <strong>{invitation.role.replace('_', ' ')}</strong>
                </>
              ) : (
                'Create your account to join the team'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {invitation && (
              <div className="bg-muted rounded-lg p-3 mb-4 text-sm text-center text-muted-foreground">
                Joining as: <strong>{invitation.email}</strong>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number (Optional)</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+254 700 000 000"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {formData.password && (
                  <p className={`text-xs ${passwordStrength.color}`}>
                    Password strength: {passwordStrength.strength}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="password_confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.password_confirm}
                    onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {formData.password_confirm && formData.password !== formData.password_confirm && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.first_name || !formData.last_name || !formData.password || !formData.password_confirm}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Accept Invitation & Create Account'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By accepting this invitation you agree to our{' '}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}