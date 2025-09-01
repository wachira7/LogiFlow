// context/AuthContext.tsx 
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthService } from '@/services/authService'
import { TokenManager } from '@/utils/auth/tokenManager'
import type {
  User,
  Company,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthError,
  UpdateProfileRequest,
} from '@/types/auth.types'

interface AuthState {
  user: User | null
  company?: Company | undefined
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (credentials: RegisterCredentials) => Promise<boolean>
  logout: () => Promise<void>
  forgotPassword: (request: ForgotPasswordRequest) => Promise<boolean>
  resetPassword: (request: ResetPasswordRequest) => Promise<boolean>
  changePassword: (request: ChangePasswordRequest) => Promise<boolean>
  updateProfile: (updates: UpdateProfileRequest) => Promise<boolean>
  uploadAvatar: (file: File) => Promise<boolean>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
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

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await AuthService.login(credentials)

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
        return true
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
        return false
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
      return false
    }
  }

  const register = async (credentials: RegisterCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

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
        return true
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
        return false
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
      return false
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
    }
  }

  const forgotPassword = async (request: ForgotPasswordRequest): Promise<boolean> => {
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
        return false
      }
      
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Failed to send reset email',
        },
      }))
      return false
    }
  }

  const resetPassword = async (request: ResetPasswordRequest): Promise<boolean> => {
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
        return false
      }
      
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Password reset failed',
        },
      }))
      return false
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
    try {
      const response = await AuthService.verifyAuth()
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          user: response.data || null,
          isAuthenticated: true,
          error: null,
        }))
      }
    } catch (error) {
      console.error('Auth refresh failed:', error)
    }
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