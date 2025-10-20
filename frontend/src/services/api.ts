// services/api.ts 
import { TokenManager } from '@/utils/auth/tokenManager'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  status: number
  success: boolean
}

export interface ApiError {
  message: string
  status: number
  field?: string
  details?: Record<string, unknown>
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const authHeaders = TokenManager.getAuthHeader()
    
    return {
      ...this.defaultHeaders,
      ...authHeaders,
      ...customHeaders,
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status
    const success = response.ok

    try {
      const data = await response.json()
      
      if (!success) {
        // Handle different error formats from Django REST Framework
        const errorMessage = data.detail || 
                            data.message || 
                            data.error || 
                            this.getErrorFromData(data) ||
                            `Request failed with status ${status}`

        return {
          data: undefined,
          error: errorMessage,
          status,
          success: false,
        }
      }

      return {
        data,
        status,
        success: true,
      }
    } catch {
      // Handle non-JSON responses
      const text = await response.text().catch(() => 'Unknown error')
      
      return {
        data: undefined,
        error: text || `Request failed with status ${status}`,
        status,
        success: false,
      }
    }
  }

  /**
   * Extract error message from Django REST Framework error format
   */
  private getErrorFromData(data: unknown): string | null {
    if (typeof data === 'string') return data
    
    if (Array.isArray(data) && data.length > 0) {
      return data[0]
    }
    
    if (typeof data === 'object' && data !== null) {
      // Handle field-specific errors
      const fieldErrors = Object.entries(data)
        .filter(([, value]) => Array.isArray(value) || typeof value === 'string')
        .map(([key, value]) => {
          const errorMsg = Array.isArray(value) ? value[0] : value
          return `${key}: ${errorMsg}`
        })
      
      if (fieldErrors.length > 0) {
        return fieldErrors[0] // Return first error
      }
    }
    
    return null
  }

  /**
   * Handle token refresh
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      if (!refreshToken) return false

      const response = await fetch(`${this.baseURL}/api/v1/auth/token/refresh/`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        TokenManager.setTokens({
          access: data.access,
          refresh: refreshToken,
          expires_in: data.expires_in || 3600, // Default 1 hour
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      return false
    }
  }

  /**
   * Make API request with automatic token refresh
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const headers = this.getHeaders(options.headers as Record<string, string>)

    try {
      // First attempt
      let response = await fetch(url, {
        ...options,
        headers,
      })

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && TokenManager.getRefreshToken()) {
        const refreshed = await this.refreshToken()
        
        if (refreshed) {
          // Retry with new token
          const newHeaders = this.getHeaders(options.headers as Record<string, string>)
          response = await fetch(url, {
            ...options,
            headers: newHeaders,
          })
        } else {
          // Refresh failed, clear tokens and redirect to login
          TokenManager.clearTokens()
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
      }

      return this.handleResponse<T>(response)
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error)
      
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Network error occurred',
        status: 0,
        success: false,
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return this.makeRequest<T>(url.pathname + url.search, {
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    })
  }

 /**
 * Upload file
 */
  async upload<T>(endpoint: string, file: File, fieldName: string = 'file', additionalData?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append(fieldName, file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    const authHeaders = TokenManager.getAuthHeader()
    
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        ...authHeaders,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
    })
  }
}

// Create and export API client instance
export const api = new ApiClient(API_BASE_URL)

// Export convenience methods
export const { get, post, put, patch, delete: del, upload } = api