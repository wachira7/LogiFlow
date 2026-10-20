// src/components/ops/useLocationSharing.ts
// Shares the device's GPS position while on, sending batches so a weak signal doesn't lose points.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { opsService, type PingInput } from '@/services/opsService'

const SEND_EVERY_MS = 20000
const MIN_GAP_MS = 10000  // ignore positions closer together than this
const MAX_BUFFER = 100

export type SharingState = 'off' | 'starting' | 'on' | 'denied' | 'unsupported' | 'error'

export function useLocationSharing() {
  const [state, setState] = useState<SharingState>('off')
  const [lastSent, setLastSent] = useState<Date | null>(null)
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const watch = useRef<number | null>(null)
  const buffer = useRef<PingInput[]>([])
  const lastAt = useRef(0)
  const sentOnce = useRef(false)

  const flush = useCallback(async () => {
    if (!buffer.current.length) return
    const batch = buffer.current.splice(0, MAX_BUFFER)
    try {
      await opsService.sendPings(batch)
      sentOnce.current = true
      setLastSent(new Date())
    } catch {
      // offline or server busy: keep the points and try again next round
      buffer.current = [...batch, ...buffer.current].slice(-MAX_BUFFER)
    }
  }, [])

  const stop = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null
    flush()
    setState('off')
  }, [flush])

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return setState('unsupported')
    setState('starting')
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos)
        setState('on')
        if (pos.timestamp - lastAt.current < MIN_GAP_MS) return
        lastAt.current = pos.timestamp
        const c = pos.coords
        buffer.current.push({
          latitude: c.latitude, longitude: c.longitude, accuracy_m: c.accuracy ?? null,
          speed_kmh: c.speed != null && c.speed >= 0 ? c.speed * 3.6 : null, heading: c.heading != null && !Number.isNaN(c.heading) ? c.heading : null,
          recorded_at: new Date(pos.timestamp).toISOString(),
        })
        if (buffer.current.length > MAX_BUFFER) buffer.current.shift()
        if (!sentOnce.current) flush()  // show up on the map straight away; batch after that
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    )
  }, [flush])

  useEffect(() => {
    if (state !== 'on') return
    const t = setInterval(flush, SEND_EVERY_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onHide) }
  }, [state, flush])

  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current) }, [])

  return { state, start, stop, lastSent, position }
}
