// services/authService.ts 
import { api } from './api'
import { TokenManager } from '@/utils/auth/tokenManager'
import type { AuthResponse, LoginCredentials, RegisterCredentials, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, User, UserProfile, UpdateProfileRequest } from '@/types/auth.types'
import type { ApiResponse } from './api'

export class AuthService {
  /**
   * Login user - Extract tokens from nested tokens object
   */
  static async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await api.post<{user: User, tokens: {access: string, refresh: string}, message: string}>('/api/v1/auth/login/', {
        email: credentials.email,
        password: credentials.password,
      })

    if (response.success && response.data) {
          if (response.data.tokens) {
            TokenManager.setTokens({
              access: response.data.tokens.access,
              refresh: response.data.tokens.refresh,
              expires_in: 3600,
            })
          }

          //  STORE USER DATA
          TokenManager.setUser(response.data.user)

          
          return {
            success: true,
            data: {
              user: response.data.user,
              access: response.data.tokens.access,
              refresh: response.data.tokens.refresh,
              expires_in: 3600,
            },
            status: 200,
          }
        } else {
          return {
            success: false,
            error: response.error || 'Login failed. Please try again.',
            fieldErrors: response.fieldErrors,
            status: response.status || 500,
          }
        }
            } catch (error) {
              console.error('Login failed:', error)
              return {
                success: false,
                error: 'Login failed. Please try again.',
                status: 500,
              }
            }
        }

  /**
   * Register new user Extract tokens from nested tokens object
   */
  static async register(credentials: RegisterCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await api.post<{user: User, tokens: {access: string, refresh: string}, message: string}>('/api/v1/auth/register/', {
        email: credentials.email,
        password: credentials.password,
        password_confirm: credentials.password_confirm,
        first_name: credentials.first_name,
        last_name: credentials.last_name,
        phone_number: credentials.phone_number,
        company_name: credentials.company_name,
        company_industry: credentials.company_industry,
      })

     if (response.success && response.data) {
        if (response.data.tokens) {
          TokenManager.setTokens({
            access: response.data.tokens.access,
            refresh: response.data.tokens.refresh,
            expires_in: 3600,
          })
        }

          // STORE USER DATA
        TokenManager.setUser(response.data.user)


        return {
          success: true,
          data: {
            user: response.data.user,
            access: response.data.tokens.access,
            refresh: response.data.tokens.refresh,
            expires_in: 3600,
          },
          status: 201,
        }
      } else {
        return {
          success: false,
          error: response.error || 'Registration failed. Please try again.',
          fieldErrors: response.fieldErrors,
          status: response.status || 500,
        }
      }
          } catch (error) {
            console.error('Registration failed:', error)
            return {
              success: false,
              error: 'Registration failed. Please try again.',
              status: 500,
            }
          }
      }

  /**
   * Logout user - server handles cookie clearing
   */
  static async logout(): Promise<ApiResponse<void>> {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      
      const response = await api.post<void>('/api/v1/auth/logout/', {
        refresh_token: refreshToken
      })

      TokenManager.clearTokens()
      TokenManager.clearAllTemporaryData()

      if (response.success) {
        return {
          success: true,
          status: 200,
        }
      } else {
        return {
          success: false,
          error: 'Logout failed',
          status: response.status,
        }
      }
    } catch (error) {
      TokenManager.clearTokens()
      TokenManager.clearAllTemporaryData()

      console.error('Logout API call failed:', error)
      return {
        success: true,
        status: 200,
      }
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<ApiResponse<{ access: string; expires_in: number }>> {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
          status: 401,
        }
      }

      const response = await api.post<{ access: string; refresh?: string; expires_in: number }>('/api/v1/auth/token/refresh/', {
        refresh: refreshToken,
      })

      if (response.success && response.data) {
        TokenManager.setTokens({
          access: response.data.access,
          // refresh tokens rotate (and the old one is blacklisted), so keep the new one
          refresh: response.data.refresh ?? refreshToken,
          expires_in: response.data.expires_in,
        })

        console.log('Token refreshed successfully')
      }

      return response
    } catch (error) {
      console.error('Token refresh failed:', error)
      TokenManager.clearTokens()
      
      return {
        success: false,
        error: 'Token refresh failed',
        status: 401,
      }
    }
  }

  /**
   * Change password - Updated to match Django ChangePasswordSerializer
   */
  static async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<{ message: string; tokens?: { access: string; refresh: string; expires_in: number } }>> {
    try {
      const response = await api.post<{ message: string; tokens?: { access: string; refresh: string; expires_in: number } }>('/api/v1/auth/change-password/', {
        old_password: request.current_password,
        new_password: request.new_password,
        new_password_confirm: request.new_password_confirm,
      })

      if (response.success && response.data?.tokens) {
        TokenManager.setTokens({
          access: response.data.tokens.access,
          refresh: response.data.tokens.refresh,
          expires_in: response.data.tokens.expires_in,
        })

        console.log('Password changed successfully')
      }

      return response
    } catch (error) {
      console.error('Password change failed:', error)
      return {
        success: false,
        error: 'Failed to change password. Please check your current password.',
        status: 500,
      }
    }
  }

  /**
   * Verify if user is authenticated
   */
 static async verifyAuth(): Promise<ApiResponse<User>> {
    try {
      if (!TokenManager.isAuthenticated()) {
        return { success: false, error: 'Not authenticated', status: 401 }
      }

      if (TokenManager.needsRefresh()) {
        const refreshResult = await this.refreshToken()
        if (!refreshResult.success) {
          return { success: false, error: 'Authentication expired', status: 401 }
        }
      }

      //Use stored user — preserves is_platform_admin, all roles, company data
      const storedUser = TokenManager.getUser()
      if (storedUser) {
        return { success: true, data: storedUser, status: 200 }
      }

      //Fallback: profile endpoint (only hits if localStorage was cleared)
      const profileResponse = await this.getProfile()
      if (profileResponse.success && profileResponse.data) {
        return {
          success: true,
          data: {
            ...profileResponse.data,
            full_name: `${profileResponse.data.first_name} ${profileResponse.data.last_name}`,
            company_id: '',
            company_name: '',
            is_active: true,
            is_platform_admin: false,
            is_company_owner: false,
            is_warehouse_manager: false,
            is_production_manager: false,
            is_logistics_coordinator: false,
            is_inventory_manager: false,
            is_driver: false,
            role: 'user',
            date_joined: new Date().toISOString(),
            name: `${profileResponse.data.first_name} ${profileResponse.data.last_name}`,
            avatar: profileResponse.data.profile_picture,
          } as User,
          status: 200,
        }
      }

      return { success: false, error: 'Failed to verify authentication', status: 401 }
    } catch (error) {
      console.error('Auth verification failed:', error)
      return { success: false, error: 'Authentication verification failed', status: 500 }
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/reset-password/', {
        token: request.token,
        password: request.password,
        password_confirm: request.password_confirm,
      })

      if (response.success) {
        console.log('Password reset successful')
      }

      return response
    } catch (error) {
      console.error('Password reset failed:', error)
      return {
        success: false,
        error: 'Password reset failed. The token may be expired or invalid.',
        status: 500,
      }
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(updates: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const transformedUpdates: Record<string, unknown> = { ...updates }
      
      if (updates.phone && !updates.phone_number) {
        transformedUpdates.phone_number = updates.phone
        delete transformedUpdates.phone
      }
      
      if (updates.avatar && !updates.profile_picture) {
        transformedUpdates.profile_picture = updates.avatar
        delete transformedUpdates.avatar
      }

      const response = await api.patch<UserProfile>('/api/v1/auth/profile/', transformedUpdates)

      if (response.success) {
        console.log('Profile updated successfully')
      }

      return response
    } catch (error) {
      console.error('Failed to update profile:', error)
      return {
        success: false,
        error: 'Failed to update profile.',
        status: 500,
      }
    }
  }

  /**
   * Upload avatar
   */
  static async uploadAvatar(file: File): Promise<ApiResponse<{ profile_picture: string }>> {
    try {
      const response = await api.upload<{ profile_picture: string }>('/api/v1/auth/profile/avatar/', file, 'avatar')

      if (response.success) {
        console.log('Avatar uploaded successfully')
      }

      return response
    } catch (error) {
      console.error('Avatar upload failed:', error)
      return {
        success: false,
        error: 'Failed to upload avatar.',
        status: 500,
      }
    }
  }

  static async forgotPassword(request: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/forgot-password/', {
        email: request.email,
      })

      if (response.success) {
        console.log('Password reset email sent')
      }

      return response
    } catch (error) {
      console.error('Forgot password failed:', error)
      return {
        success: false,
        error: 'Failed to send password reset email. Please try again.',
        status: 500,
      }
    }
  }

  static async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await api.get<UserProfile>('/api/v1/auth/profile/')

      if (response.success) {
        console.log('Profile fetched successfully')
      }

      return response
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      return {
        success: false,
        error: 'Failed to fetch user profile.',
        status: 500,
      }
    }
  }

  static async getCompanyUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await api.get<User[]>('/api/v1/auth/company-users/')

      if (response.success) {
        console.log('Company users fetched successfully')
      }

      return response
    } catch (error) {
      console.error('Failed to fetch company users:', error)
      return {
        success: false,
        error: 'Failed to fetch company users.',
        status: 500,
      }
    }
  }

  static async inviteUser(email: string, role: string, message?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/invite/', {
        email,
        role,
        message,
      })

      if (response.success) {
        console.log('User invitation sent successfully')
      }

      return response
    } catch (error) {
      console.error('Failed to send invitation:', error)
      return {
        success: false,
        error: 'Failed to send user invitation.',
        status: 500,
      }
    }
  }

  static isAuthenticated(): boolean {
    return TokenManager.isAuthenticated()
  }

  static getCurrentUserId(): string | null {
    return TokenManager.getUserIdFromToken()
  }

  static clearAuthData(): void {
    TokenManager.clearTokens()
    TokenManager.clearAllTemporaryData()
    console.log('All authentication data cleared')
  }

  static async toggleTwoFactor(enabled: boolean): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/two-factor/', {
        enabled,
      })

      if (response.success) {
        console.log(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`)
      }

      return response
    } catch (error) {
      console.error('Two-factor toggle failed:', error)
      return {
        success: false,
        error: 'Failed to update two-factor authentication.',
        status: 500,
      }
    }
  }

  static async resendEmailVerification(): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/resend-verification/')

      if (response.success) {
        console.log('Verification email sent')
      }

      return response
    } catch (error) {
      console.error('Failed to resend verification email:', error)
      return {
        success: false,
        error: 'Failed to send verification email.',
        status: 500,
      }
    }
  }

  static async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await api.post<{ message: string }>('/api/v1/auth/verify-email/', {
        token,
      })

      if (response.success) {
        console.log('Email verified successfully')
      }

      return response
    } catch (error) {
      console.error('Email verification failed:', error)
      return {
        success: false,
        error: 'Email verification failed. The token may be expired or invalid.',
        status: 500,
      }
    }
  }
}