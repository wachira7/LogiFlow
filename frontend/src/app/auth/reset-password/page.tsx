// app/auth/reset-password/page.tsx
import { Suspense } from 'react'
import { PublicRoute } from '@/components/auth/AuthGuard'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <PublicRoute>
      {/* useSearchParams needs a Suspense boundary */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </PublicRoute>
  )
}
