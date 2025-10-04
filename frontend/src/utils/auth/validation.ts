// utils/auth/validation.ts
import { z } from 'zod';

// Password requirements: minimum 8 characters, uppercase, special character
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional()
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  password_confirm: z.string(),
  first_name: nameSchema,
  last_name: nameSchema,
  company_name: z.string().optional(),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"]
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  password_confirm: z.string()
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"]
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  password_confirm: z.string()
}).refine((data) => data.new_password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"]
}).refine((data) => data.current_password !== data.new_password, {
  message: "New password must be different from current password",
  path: ["new_password"]
})

export const updateProfileSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  notifications_enabled: z.boolean().optional()
})

// FIXED: Alternative approach with custom error message
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.string().refine(
    (val) => ['admin', 'manager', 'user'].includes(val),
    { message: 'Please select a role' }
  ),
  message: z.string().max(500, 'Message must be less than 500 characters').optional()
});

// Validation helper functions
export const validatePassword = (password: string) => {
  const result = passwordSchema.safeParse(password)
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.issues.map(issue => issue.message)
  }
}

export const validateEmail = (email: string) => {
  const result = emailSchema.safeParse(email)
  return {
    isValid: result.success,
    error: result.success ? null : result.error.issues[0]?.message
  }
}

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0
  
  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: Record<string, string>
}

export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> => {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errors: Record<string, string> = {}
  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.')
    errors[field] = issue.message
  })
  
  return { success: false, errors }
}