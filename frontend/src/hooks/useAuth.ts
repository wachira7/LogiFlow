// hooks/useAuth.ts 
'use client'

import { useAuth as useAuthContext } from '@/context/AuthContext'
import { TokenManager } from '@/utils/auth/tokenManager'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { RegisterCredentials } from '@/types/auth.types'

// Re-export the main auth hook
export { useAuth } from '@/context/AuthContext'

// Additional auth utilities hook
export function useAuthUtils() {
  const auth = useAuthContext()
  const router = useRouter()
  const { toast } = useToast()

  /**
   * Login with toast notifications
   */
  const loginWithToast = async (credentials: { email: string; password: string; remember_me?: boolean }) => {
    const result = await auth.login(credentials)
    
    if (result.success) {
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      })
      
      // Check for pending plan selection or redirect URL
      const pendingPlan = TokenManager.getTemporaryData('pendingPlan')
      const redirectUrl = TokenManager.getTemporaryData('redirectUrl')
      
      if (pendingPlan) {
        router.push('/billing/subscriptions')
        TokenManager.clearTemporaryData('pendingPlan')
      } else if (redirectUrl?.toString()) {
        router.push(redirectUrl.toString())
        TokenManager.clearTemporaryData('redirectUrl')
      } else {
        router.push('/dashboard')
      }
    } else {
      toast({
        title: "Login failed",
        description: result.error || "Please check your credentials and try again.",
        variant: "destructive",
      })
    }
    
    return result
  }

  /**
   * Register with toast notifications - FIXED to use password_confirm
   */
  const registerWithToast = async (credentials: RegisterCredentials) => {
    // On success the auth context sends the new user to /auth/company-setup
    const result = await auth.register(credentials)
    
    if (result.success) {
      toast({
        title: "Account created!",
        description: "Let's finish setting up your company.",
      })
    } else {
      toast({
        title: "Registration failed",
        description: result.error || "Please check your information and try again.",
        variant: "destructive",
      })
    }
    
    return result
  }

  /**
   * Logout with confirmation
   */
  const logoutWithConfirmation = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?')
    
    if (confirmed) {
      await auth.logout()
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      })
    }
  }

  /**
   * Forgot password with toast
   */
  const forgotPasswordWithToast = async (email: string) => {
    const result = await auth.forgotPassword({ email })
    
    if (result.success) {
      toast({
        title: "Reset email sent!",
        description: "Please check your email for password reset instructions.",
      })
    } else {
      toast({
        title: "Failed to send reset email",
        description: result.error || "Please try again later.",
        variant: "destructive",
      })
    }
    
    return result
  }

  /**
   * Reset password with toast - FIXED parameter names and logic
   */
  const resetPasswordWithToast = async (token: string, password: string, passwordConfirm: string) => {
    const result = await auth.resetPassword({
      token,
      password,
      password_confirm: passwordConfirm
    })
    
    if (result.success) {
      toast({
        title: "Password reset successful!",
        description: "You can now log in with your new password.",
      })
      
      router.push('/auth/login')
    } else {
      toast({
        title: "Password reset failed",
        description: result.error || "The reset link may be expired or invalid.",
        variant: "destructive",
      })
    }
    
    return result
  }

  /**
   * Change password with toast - Updated to match Django backend
   */
  const changePasswordWithToast = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const success = await auth.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: confirmPassword  // Updated to match Django ChangePasswordSerializer
    })
    
    if (success) {
      toast({
        title: "Password changed!",
        description: "Your password has been updated successfully.",
      })
    } else {
      toast({
        title: "Password change failed",
        description: auth.error?.message || "Please check your current password.",
        variant: "destructive",
      })
    }
    
    return success
  }

  /**
   * Update profile with toast - Updated field names
   */
  const updateProfileWithToast = async (updates: {
    first_name?: string
    last_name?: string
    phone_number?: string  // Updated to match Django
    profile_picture?: string  // Updated to match Django
    // Backward compatibility
    phone?: string
    avatar?: string
  }) => {
    // Transform compatibility fields
    const transformedUpdates = { ...updates }
    if (updates.phone && !updates.phone_number) {
      transformedUpdates.phone_number = updates.phone
      delete transformedUpdates.phone
    }
    if (updates.avatar && !updates.profile_picture) {
      transformedUpdates.profile_picture = updates.avatar
      delete transformedUpdates.avatar
    }
    
    const success = await auth.updateProfile(transformedUpdates)
    
    if (success) {
      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      })
    } else {
      toast({
        title: "Update failed",
        description: auth.error?.message || "Failed to update profile.",
        variant: "destructive",
      })
    }
    
    return success
  }

  /**
   * Upload avatar with toast
   */
  const uploadAvatarWithToast = async (file: File) => {
    const success = await auth.uploadAvatar(file)
    
    if (success) {
      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been updated.",
      })
    } else {
      toast({
        title: "Upload failed",
        description: auth.error?.message || "Failed to upload avatar.",
        variant: "destructive",
      })
    }
    
    return success
  }

  /**
   * Redirect to login with current URL stored
   */
  const redirectToLogin = (message?: string) => {
    // Store current URL for redirect after login
    const currentUrl = window.location.pathname + window.location.search
    if (currentUrl !== '/auth/login' && currentUrl !== '/auth/register') {
      TokenManager.setTemporaryData('redirectUrl', currentUrl)
    }
    
    if (message) {
      toast({
        title: "Authentication required",
        description: message,
        variant: "destructive",
      })
    }
    
    router.push('/auth/login')
  }

  /**
   * Check if user has specific role - Updated for Django boolean roles
   */
  const hasRole = (role: string): boolean => {
    if (!auth.user) return false
    
    switch (role) {
      case 'company_owner':
        return auth.user.is_company_owner
      case 'warehouse_manager':
        return auth.user.is_warehouse_manager
      case 'production_manager':
        return auth.user.is_production_manager
      case 'logistics_coordinator':
        return auth.user.is_logistics_coordinator
      case 'inventory_manager':
        return auth.user.is_inventory_manager
      case 'driver':
        return auth.user.is_driver
      default:
        return false
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return auth.user ? roles.some(role => hasRole(role)) : false
  }

  /**
   * Check if user is company owner
   */
  const isCompanyOwner = (): boolean => {
    return auth.user?.is_company_owner || false
  }

  /**
   * Check if user has any manager role
   */
  const isAnyManager = (): boolean => {
    if (!auth.user) return false
    return auth.user.is_warehouse_manager || 
           auth.user.is_production_manager || 
           auth.user.is_logistics_coordinator || 
           auth.user.is_inventory_manager
  }

  /**
   * Check if user is admin (company owner) - Updated
   */
  const isAdmin = (): boolean => {
    return isCompanyOwner()
  }

  /**
   * Check if user is manager or admin - Updated
   */
  const isManagerOrAdmin = (): boolean => {
    return isCompanyOwner() || isAnyManager()
  }

  /**
   * Get user display name
   */
  const getUserDisplayName = (): string => {
    if (!auth.user) return 'Guest'
    return auth.user.name || `${auth.user.first_name} ${auth.user.last_name}` || auth.user.email
  }

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = (): string => {
    if (!auth.user) return 'GU'
    
    if (auth.user.first_name && auth.user.last_name) {
      return `${auth.user.first_name.charAt(0)}${auth.user.last_name.charAt(0)}`.toUpperCase()
    }
    
    return auth.user.email.charAt(0).toUpperCase()
  }

  /**
   * Get user role as string - FIXED: Added missing function
   */
  const getUserRole = (): string => {
    if (!auth.user) return 'guest'
    
    if (auth.user.is_company_owner) return 'company_owner'
    if (auth.user.is_warehouse_manager) return 'warehouse_manager'
    if (auth.user.is_production_manager) return 'production_manager'
    if (auth.user.is_logistics_coordinator) return 'logistics_coordinator'
    if (auth.user.is_inventory_manager) return 'inventory_manager'
    if (auth.user.is_driver) return 'driver'
    
    return 'user'
  }

  /**
   * Get user avatar URL - FIXED: Added missing function
   */
  const getUserAvatar = (): string | null => {
    if (!auth.user) return null
    return auth.user.profile_picture || auth.user.avatar || null
  }

  return {
    // Enhanced auth functions with toast notifications
    loginWithToast,
    registerWithToast,
    logoutWithConfirmation,
    forgotPasswordWithToast,
    resetPasswordWithToast,
    changePasswordWithToast,
    updateProfileWithToast,
    uploadAvatarWithToast,
    
    // Utility functions - Updated for Django role system
    redirectToLogin,
    hasRole,
    hasAnyRole,
    isCompanyOwner,
    isAnyManager,
    isAdmin,
    isManagerOrAdmin,
    getUserDisplayName,
    getUserInitials,
    getUserRole, // FIXED: Now implemented
    getUserAvatar, // FIXED: Now implemented
    
    // Clear error function
    clearError: auth.clearError,
  }
}