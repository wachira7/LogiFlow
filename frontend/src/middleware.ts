// src/middleware.ts 
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/terms',
  '/privacy',
  '/contact',
  '/pricing',
  '/about',
]

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/inventory',
  '/distribution',
  '/production',
  '/warehousing',
  '/analytics',
  '/billing',
  '/profile',
  '/settings',
  '/company',
]

// Define admin-only routes
const adminRoutes = [
  '/platform-admin',
]

// Helper function to check if a path matches any route pattern
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route === pathname) return true
    if (route.endsWith('/*')) {
      const baseRoute = route.slice(0, -2)
      return pathname.startsWith(baseRoute)
    }
    return pathname.startsWith(route + '/')
  })
}

// Helper function to check if user has valid token from cookies
function hasValidToken(request: NextRequest): boolean {
  const authToken = request.cookies.get('authToken')?.value
  const tokenExpiry = request.cookies.get('tokenExpiry')?.value
  
  if (!authToken) return false

  try {
    // Check if token is expired
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10)
      const currentTime = Date.now()
      
      if (currentTime >= expiryTime) {
        return false
      }
    }

    // Basic token validation - decode JWT payload
    const payload = JSON.parse(atob(authToken.split('.')[1]))
    const currentTime = Date.now() / 1000
    
    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

// Helper function to get user role from token
function getUserRole(request: NextRequest): string | null {
  const authToken = request.cookies.get('authToken')?.value
  
  if (!authToken) return null

  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]))
    return payload.role || 'user'
  } catch {
    return null
  }
}

// Helper function to clear auth cookies
function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('authToken', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: false, // We need to clear client-side cookies too
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  
  response.cookies.set('refreshToken', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  
  response.cookies.set('tokenExpiry', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = hasValidToken(request)
  const userRole = getUserRole(request)

  // Allow public routes for everyone
  if (matchesRoute(pathname, publicRoutes)) {
    // If authenticated user tries to access auth pages, redirect to dashboard
    if (isAuthenticated && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Check admin routes
  if (matchesRoute(pathname, adminRoutes)) {
    if (!isAuthenticated) {
      // Clear any invalid cookies
      const response = NextResponse.redirect(new URL('/auth/login?redirect=' + encodeURIComponent(pathname), request.url))
      clearAuthCookies(response)
      return response
    }
    
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    return NextResponse.next()
  }

  // Check protected routes
  if (matchesRoute(pathname, protectedRoutes)) {
    if (!isAuthenticated) {
      // Clear any invalid cookies and redirect to login
      const response = NextResponse.redirect(new URL('/auth/login?redirect=' + encodeURIComponent(pathname), request.url))
      clearAuthCookies(response)
      return response
    }
    
    return NextResponse.next()
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Allow public API endpoints
    const publicApiRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/health',
      '/api/public',
    ]
    
    if (matchesRoute(pathname, publicApiRoutes)) {
      return NextResponse.next()
    }
    
    // Protected API endpoints require authentication
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Admin-only API endpoints
    const adminApiRoutes = [
      '/api/admin',
      '/api/platform-admin',
    ]
    
    if (matchesRoute(pathname, adminApiRoutes) && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.next()
  }

  // For any other routes not explicitly handled, allow them through
  // This includes static files, _next files, etc.
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions (images, fonts, etc.)
  ) {
    return NextResponse.next()
  }

  // Default: redirect unknown protected routes to login
  if (!isAuthenticated) {
    const response = NextResponse.redirect(new URL('/auth/login?redirect=' + encodeURIComponent(pathname), request.url))
    clearAuthCookies(response)
    return response
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}