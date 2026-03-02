// frontend/src/app/auth/layout.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Truck, BarChart3, Shield, Globe } from 'lucide-react'

const features = [
  { icon: Truck, text: 'Real-time fleet tracking' },
  { icon: BarChart3, text: 'Advanced analytics & reporting' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: Globe, text: 'Multi-location support' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative flex-col justify-between p-12 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Warehouse image overlay */}
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/modern-logistics-warehouse.png"
            alt="Logistics"
            fill
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10">
              <Image
                src="/logiflow-logo.png"
                alt="LogiFlow"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-serif font-bold text-2xl text-primary-foreground">
              LogiFlow
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-serif font-bold text-3xl text-primary-foreground mb-4">
              Revolutionize Your Logistics Operations
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Join 500+ companies streamlining their supply chain with our powerful platform.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="flex items-center space-x-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-foreground/20 rounded-lg shrink-0">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-primary-foreground/90">{feature.text}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '500+', label: 'Companies' },
            { value: '30%', label: 'Cost Savings' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-bold text-2xl text-primary-foreground">{stat.value}</div>
              <div className="text-primary-foreground/70 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Top bar with back button */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to home</span>
          </Link>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center space-x-2">
            <div className="relative w-7 h-7">
              <Image
                src="/logiflow-logo.png"
                alt="LogiFlow"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-serif font-bold text-lg">LogiFlow</span>
          </div>

          {/* Auth switch link */}
          <div className="text-sm text-muted-foreground">
            {pathname === '/auth/login' ? (
              <span>
                No account?{' '}
                <Link href="/auth/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </span>
            ) : pathname === '/auth/register' ? (
              <span>
                Have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </span>
            ) : null}
          </div>
        </div>

        {/* Animated form area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md lg:max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 LogiFlow by{' '}
            <span className="font-medium">WaruTech</span>
            {' · '}
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            {' · '}
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  )
}