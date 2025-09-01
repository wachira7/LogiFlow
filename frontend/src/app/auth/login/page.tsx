// app/auth/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'
import { PublicRoute } from '@/components/auth/AuthGuard'

export default function LoginPage() {
  return (
    <PublicRoute>
      <LoginForm />
    </PublicRoute>
  )
}
