// src/app/(app)/settings/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, Lock, Settings, User } from 'lucide-react'
import { PageHeader } from '@/components/app/kit'
import { cn } from '@/lib/utils'

const NAV = [
  { name: 'Profile', href: '/settings/general', icon: User, hint: 'Your name, photo and phone' },
  { name: 'Security', href: '/settings/security', icon: Lock, hint: 'Password and sign-ins' },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell, hint: 'What we email you about' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Settings" description="Your personal account. Company-wide settings live under Company." />
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Settings sections">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                className={cn('relative flex shrink-0 items-start gap-3 rounded-xl px-3 py-2.5 transition-colors', active ? 'text-brand' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {active && <motion.span layoutId="settings-nav" className="absolute inset-0 -z-10 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span><span className="block text-sm font-medium">{item.name}</span><span className="hidden text-xs opacity-80 lg:block">{item.hint}</span></span>
              </Link>
            )
          })}
        </nav>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  )
}
