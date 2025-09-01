// components/auth/ProtectedRoute.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthUtils } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallback?: React.ReactNode
  showUnauthorized?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  fallback,
  showUnauthorized = true
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { hasAnyRole, getUserRole } = useAuthUtils()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (requiredRoles.length === 0) {
      setHasAccess(true)
      return
    }

    // Use the utility function to check roles properly
    if (user && hasAnyRole(requiredRoles)) {
      setHasAccess(true)
    } else {
      setHasAccess(false)
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, router, hasAnyRole])

  // Loading state
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null // Router.push will handle redirect
  }

  // Not authorized (wrong role)
  if (!hasAccess && showUnauthorized) {
    const userRole = getUserRole()
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
              You don&apos;t have permission to access this page.
            </p>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {requiredRoles.length > 0 ? (
                <>
                  This page requires one of the following roles: {' '}
                  <strong>{requiredRoles.join(', ')}</strong>
                  <br />
                  Your current role: <strong>{userRole}</strong>
                </>
              ) : (
                'You do not have sufficient permissions to view this page.'
              )}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => router.back()}
              variant="outline"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Not authorized and not showing unauthorized page
  if (!hasAccess) {
    return null
  }

  // Has access - render children
  return <>{children}</>
}

// Convenience wrapper for pages that need authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Updated role-based wrappers to use Django role names
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['company_owner']}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerOrAdmin({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['company_owner', 'warehouse_manager', 'production_manager', 'logistics_coordinator', 'inventory_manager']}>
      {children}
    </ProtectedRoute>
  )
}

export function StaffOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['company_owner', 'warehouse_manager', 'production_manager', 'logistics_coordinator', 'inventory_manager', 'driver']}>
      {children}
    </ProtectedRoute>
  )
}