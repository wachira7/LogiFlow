// src/components/app/DemoBanner.tsx
// Shown inside the live demo: what this is, what to try, and switching between the manager and the driver.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight, BarChart3, ChevronDown, Command, Loader2, MapPin, Radar, Siren, Smartphone, Sparkles, Truck, UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { demoService } from '@/services/demoService'
import { useCommandPalette } from '@/components/app/CommandPalette'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const TRY = [
  { href: '/ops', icon: Radar, title: 'Ops board', hint: 'Every shipment by stage, updating live' },
  { href: '/ops/fleet', icon: Truck, title: 'Live fleet map', hint: 'The demo van moves every minute' },
  { href: '/ops/exceptions', icon: Siren, title: 'Handle an exception', hint: 'A late delivery is waiting for an owner' },
  { href: '/distribution/shipments?status=SHIPPED', icon: MapPin, title: 'Customer tracking page', hint: 'Open a shipment, then its tracking link' },
  { href: '/analytics', icon: BarChart3, title: 'Analytics', hint: 'Two weeks of history' },
]

function hoursLeft(iso?: string | null) {
  if (!iso) return null
  const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000))
  return h <= 1 ? 'within the hour' : `in ${h} hours`
}

export function DemoBanner() {
  const { user, startSession, logout } = useAuth()
  const router = useRouter()
  const palette = useCommandPalette()
  const [busy, setBusy] = useState(false)
  if (!user?.company_is_demo) return null
  const isDriver = !!user.is_driver

  const switchRole = async () => {
    setBusy(true)
    try {
      const s = await demoService.switchRole(isDriver ? 'owner' : 'driver')
      startSession(s.user, s.tokens)
      window.location.assign(isDriver ? '/dashboard' : '/driver')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t switch.')
      setBusy(false)
    }
  }
  const signUp = async () => { await logout(); router.push('/auth/register') }

  return (
    <div role="region" aria-label="Demo" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-gradient-to-r lg:flex-nowrap from-brand/15 via-brand/5 to-transparent px-4 py-2 text-sm sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-foreground"><Sparkles className="h-3 w-3" />Live demo</span>
      <span className="hidden min-w-0 flex-1 truncate text-muted-foreground md:block" title="Explore freely: this sample company is yours alone and is deleted automatically.">
        {isDriver ? 'You’re Brian, the driver.' : 'You’re Jordan, owner of a sample company.'} It’s yours alone, deleted {hoursLeft(user.demo_expires_at)}.
      </span>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-brand/10">What to try<ChevronDown className="h-3.5 w-3.5" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Things worth a look</DropdownMenuLabel>
            {TRY.map((t) => (
              <DropdownMenuItem key={t.href} asChild>
                <Link href={t.href} className="flex items-start gap-2.5 py-2">
                  <t.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span><span className="block font-medium">{t.title}</span><span className="block text-xs text-muted-foreground">{t.hint}</span></span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => palette.open()} className="flex items-start gap-2.5 py-2">
              <Command className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span><span className="block font-medium">Search anything</span><span className="block text-xs text-muted-foreground">Press Ctrl+K (⌘K) on any page</span></span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={switchRole} className="flex items-start gap-2.5 py-2">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span><span className="block font-medium">{isDriver ? 'Back to the manager' : 'Be the driver'}</span><span className="block text-xs text-muted-foreground">{isDriver ? 'Return to the dashboard' : 'Deliver a stop with a signature on the driver app'}</span></span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button onClick={switchRole} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 font-medium shadow-sm hover:border-brand disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5 text-brand" />}
          {isDriver ? 'Manager view' : 'Driver view'}
        </button>
        <button onClick={signUp} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1 font-medium text-brand-foreground hover:bg-brand/90">
          <UserPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Create your own account</span><span className="sm:hidden">Sign up</span>
        </button>
      </div>
    </div>
  )
}
