// app/auth/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { PublicRoute } from '@/components/auth/AuthGuard'

export default function ForgotPasswordPage() {
  return (
    <PublicRoute>
      <ForgotPasswordForm />
    </PublicRoute>
  )
}
