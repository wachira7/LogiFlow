// src/middleware.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

//  PUBLIC ROUTES - No auth required
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/terms',
  '/privacy',
  '/contact',
  '/pricing',
  '/about',
]

// ✅ PROTECTED ROUTES - Auth required (regular users)
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

// ✅ PLATFORM ADMIN ROUTES - Auth + platform admin role required
const platformAdminRoutes = [
  '/platform-admin',
]

// Helper: Check if path matches route pattern
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

// Helper: Get user data from localStorage (via request headers)
function getUserFromRequest(request: NextRequest): { isPlatformAdmin: boolean; role: string } | null {
  try {
    // Try to get user data from cookie
    const userCookie = request.cookies.get('user')?.value
    if (userCookie) {
      const user = JSON.parse(decodeURIComponent(userCookie))
      return {
        isPlatformAdmin: user.is_platform_admin || false,
        role: user.role || 'user'
      }
    }

    // Fallback: Try to decode JWT token
    const authToken = request.cookies.get('authToken')?.value
    if (authToken) {
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      return {
        isPlatformAdmin: payload.is_platform_admin || false,
        role: payload.role || 'user'
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing user from request:', error)
    return null
  }
}

// Helper: Check if user has valid token
function hasValidToken(request: NextRequest): boolean {
  const authToken = request.cookies.get('authToken')?.value
  if (!authToken) return false

  try {
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

// Helper: Clear auth cookies
function clearAuthCookies(response: NextResponse): void {
  const cookieOptions = {
    path: '/',
    expires: new Date(0),
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const
  }

  response.cookies.set('authToken', '', cookieOptions)
  response.cookies.set('refreshToken', '', cookieOptions)
  response.cookies.set('tokenExpiry', '', cookieOptions)
  response.cookies.set('user', '', cookieOptions)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = hasValidToken(request)
  const userData = getUserFromRequest(request)

  console.log('🔐 Middleware Check:', {
    pathname,
    isAuthenticated,
    isPlatformAdmin: userData?.isPlatformAdmin,
    role: userData?.role
  })

  // ✅ ALLOW PUBLIC ROUTES
  if (matchesRoute(pathname, publicRoutes)) {
    // Redirect authenticated users away from auth pages
    if (isAuthenticated && pathname.startsWith('/auth/')) {
      if (userData?.isPlatformAdmin || userData?.role === 'platform_admin') {
        return NextResponse.redirect(new URL('/platform-admin', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ✅ PLATFORM ADMIN ROUTES
  if (matchesRoute(pathname, platformAdminRoutes)) {
    console.log('🛡️ Platform Admin Route Check')
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated - redirecting to login')
      const response = NextResponse.redirect(
        new URL('/auth/login?redirect=' + encodeURIComponent(pathname), request.url)
      )
      clearAuthCookies(response)
      return response
    }

    if (!userData?.isPlatformAdmin && userData?.role !== 'platform_admin') {
      console.log('❌ Not platform admin - redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('✅ Platform admin authenticated - allowing access')
    return NextResponse.next()
  }

  // ✅ PROTECTED ROUTES (Regular Users)
  if (matchesRoute(pathname, protectedRoutes)) {
    console.log('🏠 Protected Route Check')
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated - redirecting to login')
      const response = NextResponse.redirect(
        new URL('/auth/login?redirect=' + encodeURIComponent(pathname), request.url)
      )
      clearAuthCookies(response)
      return response
    }

    // ✅ REDIRECT PLATFORM ADMIN TO THEIR DASHBOARD
    if (userData?.isPlatformAdmin || userData?.role === 'platform_admin') {
      console.log('🚀 Platform admin accessing regular route - redirecting to /platform-admin')
      return NextResponse.redirect(new URL('/platform-admin', request.url))
    }

    console.log('✅ Regular user authenticated - allowing access')
    return NextResponse.next()
  }

  // ✅ API ROUTES
  if (pathname.startsWith('/api/')) {
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
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Platform admin API routes
    const adminApiRoutes = ['/api/platform-admin']
    if (matchesRoute(pathname, adminApiRoutes)) {
      if (!userData?.isPlatformAdmin && userData?.role !== 'platform_admin') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Platform admin access required' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.next()
  }

  // ✅ STATIC FILES - Always allow
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // ✅ DEFAULT - For unknown routes
  console.log('❓ Unknown route:', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}