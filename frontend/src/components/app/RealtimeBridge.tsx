// src/components/app/RealtimeBridge.tsx
// Keeps the live connection open while signed in, and surfaces urgent events anywhere in the app.
'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useRealtime, useRealtimeStatus, type RealtimeMessage } from '@/lib/realtime'
import { cn } from '@/lib/utils'

type ExceptionEvent = { id: string; created: boolean; title: string; severity: string; status: string; type_label: string }

export function RealtimeBridge() {
  const router = useRouter()
  useRealtime('exception.updated', (m: RealtimeMessage) => {
    const e = m.data as ExceptionEvent
    if (!e.created || !['HIGH', 'CRITICAL'].includes(e.severity)) return
    toast.warning(`${e.severity === 'CRITICAL' ? 'Critical' : 'New'} exception: ${e.title}`, {
      description: e.type_label, duration: 10000,
      action: { label: 'Open', onClick: () => router.push(`/ops/exceptions?open=${e.id}`) },
    })
  })
  return null
}

const LABEL = { live: 'Live', connecting: 'Connecting', reconnecting: 'Reconnecting', offline: 'Offline', idle: 'Paused' } as const

/** Small dot in the top bar: are updates arriving live? */
export function LiveIndicator() {
  const status = useRealtimeStatus()
  if (status === 'idle') return null
  return (
    <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex" title={status === 'live' ? 'Updates arrive instantly' : 'Live updates paused; pages refresh on their own'}
      role="status" aria-live="polite">
      <span className="relative flex h-2 w-2">
        {status === 'live' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', status === 'live' ? 'bg-success' : status === 'offline' ? 'bg-danger' : 'bg-warning')} />
      </span>
      <span className={status === 'live' ? 'text-success' : 'text-muted-foreground'}>{LABEL[status]}</span>
    </span>
  )
}
