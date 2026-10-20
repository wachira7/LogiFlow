// src/app/demo/page.tsx
// "Try the live demo": creates a private demo company and signs the visitor in. Linkable from anywhere.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Loader2, RotateCcw } from 'lucide-react'
import { demoService } from '@/services/demoService'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/landing/Logo'
import { ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'

const STEPS = [
  'Creating your demo company',
  'Stocking warehouses in Nairobi and Mombasa',
  'Booking two weeks of orders',
  'Putting a driver on the road',
  'Opening your dashboard',
]

export default function DemoPage() {
  const { user, isAuthenticated, isLoading, startSession } = useAuth()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const started = useRef(false)

  const begin = useCallback(async () => {
    started.current = true
    setError(null)
    setStep(0)
    // Advance the checklist while the server works (it takes a couple of seconds)
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 700)
    try {
      const session = await demoService.start()
      clearInterval(timer)
      startSession(session.user, session.tokens)
      setStep(STEPS.length - 1)
      // A full load so every part of the app (including live updates) starts with the new session
      setTimeout(() => window.location.assign('/dashboard'), reduce ? 0 : 500)
    } catch (err) {
      clearInterval(timer)
      started.current = false
      setError(err instanceof Error ? err.message : 'The demo couldn’t start. Please try again.')
    }
  }, [startSession, reduce])

  useEffect(() => {
    if (isLoading || started.current) return
    if (isAuthenticated && user?.company_is_demo) { window.location.assign('/dashboard'); return }
    if (isAuthenticated && user) { setConfirmSwitch(true); return }
    begin()
  }, [isLoading, isAuthenticated, user, begin])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand/10 via-background to-background px-4">
      <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
        <Logo />
        {confirmSwitch ? (
          <div className="mt-6 space-y-4">
            <h1 className="text-xl font-semibold">You’re signed in as {user?.first_name || user?.email}</h1>
            <p className="text-sm text-muted-foreground">Starting the demo signs you out of this account and into a separate demo company. Your own data isn’t touched.</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1"><Link href="/dashboard">Back to my account</Link></Button>
              <Button className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => { setConfirmSwitch(false); begin() }}>Start the demo</Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold">{error ? 'The demo didn’t start' : 'Setting up your demo'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? 'A private company with sample data, just for you. No sign-up, and it’s deleted after a day.'}
            </p>
            {!error ? (
              <ol className="mt-6 space-y-3" aria-live="polite">
                {STEPS.map((label, i) => {
                  const done = i < step, current = i === step
                  return (
                    <li key={label} className={cn('flex items-center gap-3 text-sm transition-colors', done ? 'text-foreground' : current ? 'font-medium' : 'text-muted-foreground')}>
                      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border', done ? 'border-brand bg-brand text-brand-foreground' : current ? 'border-brand text-brand' : 'border-muted')}>
                        {done ? <Check className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : null}
                      </span>
                      {label}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="mt-6 flex gap-2">
                <Button onClick={begin} className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"><RotateCcw className="mr-2 h-4 w-4" />Try again</Button>
                <Button asChild variant="outline" className="flex-1"><Link href="/">Back to LogiFlow</Link></Button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </main>
  )
}
