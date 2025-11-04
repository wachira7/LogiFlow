// utils/auth/tokenManager.ts 
import type { TokenPair, User } from '@/types/auth.types'

const TOKEN_KEY = 'authToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const TOKEN_EXPIRY_KEY = 'tokenExpiry'

export class TokenManager {
  /**
   * Store authentication tokens in both localStorage and cookies
   */
  static setTokens(tokens: TokenPair): void {
    try {
      // Store in localStorage for client-side access
      localStorage.setItem(TOKEN_KEY, tokens.access)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
      
      // Calculate expiry timestamp
      const expiryTime = Date.now() + (tokens.expires_in * 1000)
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
      
      // Store in cookies for middleware access
      this.setCookie(TOKEN_KEY, tokens.access, tokens.expires_in)
      this.setCookie(REFRESH_TOKEN_KEY, tokens.refresh, tokens.expires_in)
      this.setCookie(TOKEN_EXPIRY_KEY, expiryTime.toString(), tokens.expires_in)
      
      console.log('✅ Tokens stored in localStorage and cookies')
    } catch (error) {
      console.error('❌ Failed to store tokens:', error)
    }
  }

  /**
   * Set cookie helper function
   */
  private static setCookie(name: string, value: string, expiresInSeconds: number): void {
    if (typeof document === 'undefined') return
    
    const expiryDate = new Date()
    expiryDate.setTime(expiryDate.getTime() + (expiresInSeconds * 1000))
    
    const cookieOptions = [
      `${name}=${value}`,
      `expires=${expiryDate.toUTCString()}`,
      'path=/',
      'SameSite=Strict'
    ]
    
    // Add Secure flag in production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure')
    }
    
    document.cookie = cookieOptions.join('; ')
  }

  /**
   * Get access token from localStorage first, fallback to cookie reading
   */
  static getAccessToken(): string | null {
    try {
      // Try localStorage first
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) return token

      // Fallback: try to read from cookie
      if (typeof document !== 'undefined') {
        const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_KEY}=([^;]*)`))
        return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
      }

      return null
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
      return null
    }
  }

  /**
   * Get refresh token from localStorage first, fallback to cookie
   */
  static getRefreshToken(): string | null {
    try {
      // Try localStorage first
      const token = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (token) return token

      // Fallback: try to read from cookie
      if (typeof document !== 'undefined') {
        const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${REFRESH_TOKEN_KEY}=([^;]*)`))
        return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
      }

      return null
    } catch (error) {
      console.error('❌ Failed to get refresh token:', error)
      return null
    }
  }

  /**
   * Check if access token is expired
   */
  static isTokenExpired(): boolean {
    try {
      const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY) || this.getCookieValue(TOKEN_EXPIRY_KEY)
      if (!expiryTime) return true
      
      const currentTime = Date.now()
      const tokenExpiryTime = parseInt(expiryTime, 10)
      
      // Add 5-minute buffer to refresh token before actual expiry
      const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
      
      return currentTime >= (tokenExpiryTime - bufferTime)
    } catch (error) {
      console.error('❌ Failed to check token expiry:', error)
      return true
    }
  }

  /**
   * Get cookie value helper
   */
  private static getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null
    
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
  }

  /**
   * Check if user has valid authentication
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken()
    return token !== null && !this.isTokenExpired()
  }

  /**
   * Clear all authentication tokens from both localStorage and cookies
   */
  static clearTokens(): void {
  try {
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem('user')  // ✅ ADD THIS
    
    // Clear cookies
    this.clearCookie(TOKEN_KEY)
    this.clearCookie(REFRESH_TOKEN_KEY)
    this.clearCookie(TOKEN_EXPIRY_KEY)
    this.clearCookie('user')
    
    console.log('✅ Tokens and user data cleared from localStorage and cookies')
  } catch (error) {
    console.error('❌ Failed to clear tokens:', error)
  }
}

  /**
 * Store user data in localStorage
 */
static setUser(user: User): void {
    try {
      if (typeof window !== 'undefined') {
        const userJson = JSON.stringify(user)
        
        // Store in localStorage
        localStorage.setItem('user', userJson)
        
        // ✅ NEW: Also store in cookie for middleware
        this.setCookie('user', encodeURIComponent(userJson), 7 * 24 * 60 * 60) // 7 days
        
        console.log('✅ User data stored in localStorage and cookies')
      }
    } catch (error) {
      console.error('❌ Failed to store user data:', error)
    }
  }
/**
 * Get user data from localStorage
 */
static getUser(): User | null {
  try {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        return JSON.parse(userStr) as User
      }
    }
    return null
  } catch (error) {
    console.error('❌ Failed to get user data:', error)
    return null
  }
}

/**
 * Clear user data from localStorage
 */
static clearUser(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      this.clearCookie('user')
      console.log('✅ User data cleared from localStorage')
    }
  } catch (error) {
    console.error('❌ Failed to clear user data:', error)
  }
}

  /**
   * Clear cookie helper function
   */
  private static clearCookie(name: string): void {
    if (typeof document === 'undefined') return
    
    const cookieOptions = [
      `${name}=`,
      'expires=Thu, 01 Jan 1970 00:00:00 UTC',
      'path=/',
      'SameSite=Strict'
    ]
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure')
    }
    
    document.cookie = cookieOptions.join('; ')
  }



  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * Check if token needs refresh (within 10 minutes of expiry)
   */
  static needsRefresh(): boolean {
    try {
      const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY) || this.getCookieValue(TOKEN_EXPIRY_KEY)
      if (!expiryTime) return false
      
      const currentTime = Date.now()
      const tokenExpiryTime = parseInt(expiryTime, 10)
      
      // Refresh if within 10 minutes of expiry
      const refreshThreshold = 10 * 60 * 1000 // 10 minutes in milliseconds
      
      return currentTime >= (tokenExpiryTime - refreshThreshold)
    } catch (error) {
      console.error('❌ Failed to check if token needs refresh:', error)
      return false
    }
  }

  /**
   * Decode JWT token payload (without verification)
   */
  static decodeToken(token?: string): Record<string, unknown> | null {
    try {
      const tokenToUse = token || this.getAccessToken()
      if (!tokenToUse) return null
      
      const base64Url = tokenToUse.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('❌ Failed to decode token:', error)
      return null
    }
  }

  /**
   * Get user ID from token
   */
  static getUserIdFromToken(): string | null {
    try {
      const payload = this.decodeToken()
      return payload?.user_id as string || payload?.sub as string || null
    } catch (error) {
      console.error('❌ Failed to get user ID from token:', error)
      return null
    }
  }

  // Temporary data methods remain unchanged
  static setTemporaryData(key: string, data: unknown): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`❌ Failed to store temporary data for ${key}:`, error)
    }
  }

  static getTemporaryData<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`❌ Failed to get temporary data for ${key}:`, error)
      return null
    }
  }

  static clearTemporaryData(key: string): void {
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.error(`❌ Failed to clear temporary data for ${key}:`, error)
    }
  }

  static clearAllTemporaryData(): void {
    try {
      sessionStorage.clear()
      console.log('✅ Temporary data cleared successfully')
    } catch (error) {
      console.error('❌ Failed to clear temporary data:', error)
    }
  }
}