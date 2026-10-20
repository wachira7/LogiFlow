// context/AuthContext.tsx 
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthService } from '@/services/authService'
import { TokenManager } from '@/utils/auth/tokenManager'
import type { User, Company, LoginCredentials, RegisterCredentials, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, AuthError, UpdateProfileRequest } from '@/types/auth.types'
import { useRouter } from 'next/navigation'

/** Outcome of an auth action, with the backend's message and per-field errors on failure. */
export interface AuthResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

interface AuthState {
  user: User | null
  company?: Company | undefined
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthResult>
  register: (credentials: RegisterCredentials) => Promise<AuthResult>
  logout: () => Promise<void>
  forgotPassword: (request: ForgotPasswordRequest) => Promise<AuthResult>
  resetPassword: (request: ResetPasswordRequest) => Promise<AuthResult>
  changePassword: (request: ChangePasswordRequest) => Promise<boolean>
  updateProfile: (updates: UpdateProfileRequest) => Promise<boolean>
  uploadAvatar: (file: File) => Promise<boolean>
  refreshAuth: () => Promise<void>
  /** Sign in with tokens issued by another flow (the live demo) */
  startSession: (user: User, tokens: { access: string; refresh: string }) => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    company: undefined,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      if (TokenManager.isAuthenticated()) {
        // ✅ TRY TO GET USER FROM LOCALSTORAGE FIRST
        const storedUser = TokenManager.getUser()
        
        if (storedUser) {
          // User found in localStorage
          setState(prev => ({
            ...prev,
            user: storedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }))
        } else {
          // No stored user, verify with API
          const response = await AuthService.verifyAuth()
          
          if (response.success && response.data) {
            setState(prev => ({
              ...prev,
              user: response.data ?? null,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            }))
          } else {
            // Token is invalid
            TokenManager.clearTokens()
            setState(prev => ({
              ...prev,
              user: null,
              company: undefined,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            }))
          }
        }
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          company: undefined,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }))
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setState(prev => ({
        ...prev,
        user: null,
        company: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: {
          message: 'Failed to initialize authentication',
        },
      }))
    }
  }

  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.login(credentials)

      if (response.success && response.data) {
        const user = response.data.user
        
        setState(prev => ({
          ...prev,
          user: user,
          company: undefined,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }))

        // Where to go next; PublicRoute performs the single redirect once the user is set.
        // A deep link saved before login (redirectUrl) wins for regular users.
        if (user.is_platform_admin || user.role === 'platform_admin') {
          TokenManager.setTemporaryData('redirectUrl', '/platform-admin')
        } else if (!TokenManager.getTemporaryData('redirectUrl')) {
          TokenManager.setTemporaryData('redirectUrl', '/dashboard')
        }

        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          company: undefined,
          isAuthenticated: false,
          isLoading: false,
          error: {
            message: response.error || 'Login failed',
          },
        }))
        return { success: false, error: response.error || 'Login failed', fieldErrors: response.fieldErrors }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        user: null,
        company: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: {
          message: error instanceof Error ? error.message : 'Login failed',
        },
      }))
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }
  const register = async (credentials: RegisterCredentials): Promise<AuthResult> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.register(credentials)

      if (response.success && response.data) {
        // Extract user from AuthResponse
        const user = response.data.user
        
        setState(prev => ({
          ...prev,
          user: user,
          company: undefined, // We'll handle company data separately if needed
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }))

        // New companies continue to setup; PublicRoute performs the redirect
        TokenManager.setTemporaryData(
          'redirectUrl',
          user.is_platform_admin || user.role === 'platform_admin' ? '/platform-admin' : '/auth/company-setup',
        )

        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          company: undefined,
          isAuthenticated: false,
          isLoading: false,
          error: {
            message: response.error || 'Registration failed',
          },
        }))
        return { success: false, error: response.error || 'Registration failed', fieldErrors: response.fieldErrors }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        user: null,
        company: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: {
          message: error instanceof Error ? error.message : 'Registration failed',
        },
      }))
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' }
    }
  }

  const logout = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await AuthService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setState({
        user: null,
        company: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      router.push('/auth/login')
    }
  }

  const forgotPassword = async (request: ForgotPasswordRequest): Promise<AuthResult> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.forgotPassword(request)
      
      if (!response.success) {
        setState(prev => ({
          ...prev,
          error: {
            message: response.error || 'Failed to send reset email',
          },
        }))
        return { success: false, error: response.error || 'Failed to send reset email', fieldErrors: response.fieldErrors }
      }
      
      return { success: true }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Failed to send reset email',
        },
      }))
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send reset email' }
    }
  }

  const resetPassword = async (request: ResetPasswordRequest): Promise<AuthResult> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.resetPassword(request)
      
      if (!response.success) {
        setState(prev => ({
          ...prev,
          error: {
            message: response.error || 'Password reset failed',
          },
        }))
        return { success: false, error: response.error || 'Password reset failed', fieldErrors: response.fieldErrors }
      }
      
      return { success: true }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Password reset failed',
        },
      }))
      return { success: false, error: error instanceof Error ? error.message : 'Password reset failed' }
    }
  }

  const changePassword = async (request: ChangePasswordRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.changePassword(request)
      
      if (!response.success) {
        setState(prev => ({
          ...prev,
          error: {
            message: response.error || 'Password change failed',
          },
        }))
        return false
      }
      
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Password change failed',
        },
      }))
      return false
    }
  }

  const updateProfile = async (updates: UpdateProfileRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.updateProfile(updates)
      
      if (response.success && response.data) {
        // Update user in state with new profile data
        setState(prev => ({
          ...prev,
          user: prev.user ? { ...prev.user, ...response.data } : null,
        }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: {
            message: response.error || 'Profile update failed',
          },
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Profile update failed',
        },
      }))
      return false
    }
  }

  const uploadAvatar = async (file: File): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await AuthService.uploadAvatar(file)
      
      if (response.success && response.data) {
        // Update user avatar in state - Fixed to use profile_picture instead of avatar
        setState(prev => ({
          ...prev,
          user: prev.user ? { 
            ...prev.user, 
            profile_picture: response.data?.profile_picture,
            avatar: response.data?.profile_picture // Keep compatibility field
          } : null,
        }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: {
            message: response.error || 'Avatar upload failed',
          },
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Avatar upload failed',
        },
      }))
      return false
    }
  }

  const refreshAuth = async (): Promise<void> => {
    // Reload the user from the server (profile, role, company currency) and update the stored copy
    try {
      const response = await AuthService.getProfile()
      if (response.success && response.data) {
        const fresh = { ...(TokenManager.getUser() ?? {}), ...response.data } as User
        TokenManager.setUser(fresh)
        setState(prev => ({ ...prev, user: fresh, isAuthenticated: true, error: null }))
      }
    } catch (error) {
      console.error('Auth refresh failed:', error)
    }
  }


  const startSession = (user: User, tokens: { access: string; refresh: string }): void => {
    TokenManager.setTokens({ access: tokens.access, refresh: tokens.refresh, expires_in: 3600 })
    TokenManager.setUser(user)
    setState(prev => ({ ...prev, user, company: undefined, isAuthenticated: true, isLoading: false, error: null }))
  }

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }))
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    uploadAvatar,
    refreshAuth,
    startSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}