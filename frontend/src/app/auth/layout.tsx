// frontend/src/app/auth/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { Logo } from '@/components/landing/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      <AuthShowcase />

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>

          <Link href="/" className="text-primary lg:hidden dark:text-foreground" aria-label="LogiFlow home">
            <Logo />
          </Link>

          <div className="text-sm text-muted-foreground">
            {pathname === '/auth/login' ? (
              <span>
                <span className="hidden sm:inline">New to LogiFlow? </span>
                <Link href="/auth/register" className="font-medium text-brand hover:underline">
                  Create account
                </Link>
              </span>
            ) : pathname === '/auth/register' ? (
              <span>
                <span className="hidden sm:inline">Have an account? </span>
                <Link href="/auth/login" className="font-medium text-brand hover:underline">
                  Sign in
                </Link>
              </span>
            ) : (
              <span className="w-16" />
            )}
          </div>
        </div>

        {/* Form area: each page eases in when you move between sign in, sign up and reset */}
        <main className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6 lg:px-12">
          {/* keyed by route so the CSS entrance replays on every page change (and runs before JS loads) */}
          <div key={pathname} className="animate-fade-up w-full max-w-md">
            {children}
          </div>
        </main>

        <footer className="p-4 text-center text-xs text-muted-foreground sm:p-6">
          © {new Date().getFullYear()} LogiFlow · Where logistics flows seamlessly
        </footer>
      </div>
    </div>
  )
}
