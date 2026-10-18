// components/auth/AuthGuard.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth, useAuthUtils } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TokenManager } from '@/utils/auth/tokenManager'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRoles?: string[]
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRoles,
  redirectTo 
}: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { hasAnyRole } = useAuthUtils()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // If authentication is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      // Store current path for redirect after login
      if (pathname !== '/auth/login' && pathname !== '/auth/register') {
        TokenManager.setTemporaryData('redirectUrl', pathname)
      }
      
      router.push(redirectTo || '/auth/login')
      return
    }

    // If user is authenticated but shouldn't access auth pages
    if (!requireAuth && isAuthenticated) {
      const redirectUrl = TokenManager.getTemporaryData<string>('redirectUrl')
      TokenManager.clearTemporaryData('redirectUrl')
      
      router.push(redirectUrl || '/dashboard')
      return
    }

    // Check role-based access
    if (requireAuth && isAuthenticated && requiredRoles && user) {
      const userHasRequiredRole = hasAnyRole(requiredRoles)
      
      if (!userHasRequiredRole) {
        router.push('/unauthorized')
        return
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, requiredRoles, user, router, pathname, redirectTo, hasAnyRole])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // If authentication is required and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // Signed in on an auth page: show a brief state while the redirect happens
  if (!requireAuth && isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground" role="status">
        <LoadingSpinner size="md" />
        Signing you in…
      </div>
    )
  }

  // If role is required but user doesn't have it, don't render children
  if (requireAuth && isAuthenticated && requiredRoles && user) {
    const userHasRequiredRole = hasAnyRole(requiredRoles)
    
    if (!userHasRequiredRole) {
      return null
    }
  }

  // All checks passed, render children
  return <>{children}</>
}

// Higher-order component for protecting pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Specific guards for common use cases
export function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={false}>
      {children}
    </AuthGuard>
  )
}

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  )
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requiredRoles={['company_owner']}>
      {children}
    </AuthGuard>
  )
}

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requiredRoles={['company_owner', 'warehouse_manager', 'production_manager', 'logistics_coordinator', 'inventory_manager']}>
      {children}
    </AuthGuard>
  )
}