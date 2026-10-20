// types/auth.types.ts - Updated to match Django backend exactly
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string // Matches Django's get_full_name method
  phone_number?: string // Matches Django field name
  profile_picture?: string // Matches Django field name
  company_id: string // From Django UserSerializer
  company_name: string // From Django UserSerializer
  /** ISO 4217 code from company settings, e.g. KES */
  company_currency?: string
  is_active: boolean
  is_platform_admin: boolean
  is_company_owner: boolean // Django role fields
  is_warehouse_manager: boolean
  is_production_manager: boolean
  is_logistics_coordinator: boolean
  is_inventory_manager: boolean
  is_driver: boolean
  role: string
  date_joined: string
  last_login?: string
  
  // Optional computed fields for backward compatibility
  name?: string // Can be computed from full_name
  avatar?: string // Can be mapped from profile_picture
  //role?: string // Can be computed from role booleans
}

export interface Company {
  id: string
  name: string
  slug: string
  email?: string // From Django Company model
  industry?: string
  logo?: string
  size?: string
  created_at: string
  updated_at?: string
}

export interface LoginCredentials {
  email: string
  password: string
  remember_me?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  password_confirm: string 
  first_name: string
  last_name: string
  phone_number?: string // Optional in Django
  company_name: string // Required in Django
  company_industry?: string // Optional in Django
  terms_accepted: boolean // Frontend-only validation
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  password_confirm: string
}

export interface ChangePasswordRequest {
  current_password: string // Matches Django ChangePasswordSerializer
  new_password: string
  new_password_confirm: string // Matches Django field name
}

export interface AuthResponse {
  user: User
  access: string
  refresh: string
  expires_in: number
  company?: Company
}

export interface AuthError {
  message: string
  field?: string
  code?: string
}

export interface AuthState {
  user: User | null
  company?: Company | undefined
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}

export interface TokenPair {
  access: string
  refresh: string
  expires_in: number
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string // Matches Django field name
  profile_picture?: string // Matches Django field name
  // Computed fields for compatibility
  avatar?: string
  phone?: string
}

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  phone_number?: string // Matches Django ProfileUpdateSerializer
  profile_picture?: string // Matches Django field name
  
  // Optional compatibility fields
  phone?: string // Can be mapped to phone_number
  avatar?: string // Can be mapped to profile_picture
}

export interface CompanyInvitation {
  id: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER' // Matches Django choices
  invited_by: string
  created_at: string
  expires_at: string
  is_accepted: boolean
  token?: string // For invitation acceptance
}

export interface InviteUserRequest {
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
  message?: string
}

// Response types
export interface LoginResponse {
  user: User
  access: string
  refresh: string
  expires_in: number
  message?: string
}

export interface RegisterResponse {
  user: User
  access?: string
  refresh?: string
  expires_in?: number
  message: string
  requires_verification?: boolean
}

export interface PasswordResetResponse {
  message: string
  success: boolean
}

export interface ProfileUpdateResponse {
  user: UserProfile
  message: string
}

export interface AvatarUploadResponse {
  profile_picture: string // Matches Django field name
  message: string
  // Compatibility
  avatar?: string
}

// Utility types
export type UserRole = 'company_owner' | 'warehouse_manager' | 'production_manager' | 'logistics_coordinator' | 'inventory_manager' | 'driver'

// Helper function type for role checking
export type RoleChecker = {
  isCompanyOwner: boolean
  isWarehouseManager: boolean
  isProductionManager: boolean
  isLogisticsCoordinator: boolean
  isInventoryManager: boolean
  isDriver: boolean
  hasAnyManagerRole: boolean
}

export interface AuthContextType {
  user: User | null
  company?: Company | undefined
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
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

// Utility functions for role management (you can implement these in your auth utils)
export interface AuthUtils {
  getRoleChecker: (user: User) => RoleChecker
  getDisplayRole: (user: User) => string
  hasPermission: (user: User, permission: string) => boolean
  getFullName: (user: User) => string
  getAvatarUrl: (user: User) => string | undefined
}