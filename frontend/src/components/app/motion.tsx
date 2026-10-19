// src/components/app/motion.tsx
// Motion for in-app pages. Unlike the landing page (which animates on scroll, both ways),
// app content animates once on mount so it never jumps around while someone is working.
'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion, type Variants } from 'framer-motion'

export const ease = [0.22, 1, 0.36, 1] as const

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const child: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
}

/** Fades and slides its content up once, on mount. */
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Staggers its <AppStaggerItem> children in, once, on mount. */
export function AppStagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} variants={group} initial={reduce ? false : 'hidden'} animate="show">
      {children}
    </motion.div>
  )
}

export function AppStaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={child}>
      {children}
    </motion.div>
  )
}

/** A table row that fades in; `index` staggers rows (capped so long tables don't crawl). */
export function MotionRow({ index = 0, className, children, ...props }: React.ComponentProps<typeof motion.tr> & { index?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.tr
      data-slot="table-row"
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: Math.min(index, 12) * 0.035 }}
      {...props}
    >
      {children}
    </motion.tr>
  )
}

/** Animates a number up to `value` (and between values when it changes). */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const last = useRef(reduce ? value : 0)

  useEffect(() => {
    const update = (n: number) => {
      last.current = n
      setShown(n)
    }
    if (reduce) {
      update(value)
      return
    }
    const controls = animate(last.current, value, { duration: 0.9, ease, onUpdate: update })
    return () => controls.stop()
  }, [value, reduce])

  return <span className="tabular-nums">{format(shown)}</span>
}
