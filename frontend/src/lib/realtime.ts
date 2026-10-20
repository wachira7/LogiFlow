// src/lib/realtime.ts
// One WebSocket per tab for live updates. Authenticates with its first message, reconnects with
// backoff, sends a heartbeat, and only stays open while something is subscribed.
'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { TokenManager } from '@/utils/auth/tokenManager'
import { AuthService } from '@/services/authService'

export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline'
export type RealtimeMessage<T = unknown> = { type: string; data: T; at: string }
type Handler = (msg: RealtimeMessage) => void

const HEARTBEAT_MS = 25000
const MAX_BACKOFF_MS = 30000

function socketUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return api.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/ops/'
}

class RealtimeClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<Handler>>()
  private listeners = new Set<() => void>()
  private status: RealtimeStatus = 'idle'
  private attempts = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private closing = false
  private connecting = false  // set synchronously so concurrent subscribers can't open a second socket
  private cancelled = false

  getStatus = () => this.status
  private hasSubscribers = () => [...this.handlers.values()].some((h) => h.size > 0)
  onStatus = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private setStatus(s: RealtimeStatus) { if (s !== this.status) { this.status = s; this.listeners.forEach((l) => l()) } }

  subscribe(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
    this.ensure()
    return () => {
      this.handlers.get(type)?.delete(handler)
      if (!this.hasSubscribers()) this.disconnect()
    }
  }

  private ensure() {
    if (typeof window === 'undefined' || this.ws || this.retryTimer || this.connecting) return
    if (!TokenManager.getAccessToken()) return
    this.connect()
  }

  private async connect() {
    if (this.connecting || this.ws) return
    this.connecting = true
    this.cancelled = false
    try { await this.open() } finally { this.connecting = false }
    if (this.cancelled) {
      // disconnect() ran mid-connect (e.g. a page unmounted); drop that socket, reopen if someone still listens
      this.cancelled = false
      this.closeSocket()
      if (this.hasSubscribers()) this.connect()
    }
  }

  private async open() {
    this.closing = false
    this.setStatus(this.attempts ? 'reconnecting' : 'connecting')
    // A token about to expire would be rejected; refresh it first
    if (TokenManager.needsRefresh() || TokenManager.isTokenExpired()) await AuthService.refreshToken().catch(() => null)
    const token = TokenManager.getAccessToken()
    if (!token) { this.setStatus('offline'); return }
    let ws: WebSocket
    try { ws = new WebSocket(socketUrl()) } catch { this.scheduleRetry(); return }
    this.ws = ws
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }))
    ws.onmessage = (e) => {
      let msg: RealtimeMessage
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type === 'ready') {
        this.attempts = 0
        this.setStatus('live')
        this.startHeartbeat()
        this.emit({ type: 'realtime.ready', data: null, at: new Date().toISOString() })
        return
      }
      if (msg.type === 'pong' || msg.type === 'error') return
      this.emit(msg)
    }
    ws.onclose = (e) => {
      this.stopHeartbeat()
      this.ws = null
      if (this.closing) { this.setStatus('idle'); return }
      // 4401: token rejected; refresh happens on the next attempt
      this.scheduleRetry(e.code === 4401)
    }
    ws.onerror = () => { /* onclose follows */ }
  }

  private emit(msg: RealtimeMessage) {
    this.handlers.get(msg.type)?.forEach((h) => h(msg))
    this.handlers.get('*')?.forEach((h) => h(msg))
  }

  private scheduleRetry(authFailed = false) {
    if (!this.hasSubscribers()) { this.setStatus('idle'); return }
    this.attempts += 1
    this.setStatus(this.attempts > 3 ? 'offline' : 'reconnecting')
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(this.attempts - 1, 5))
    const delay = (authFailed ? Math.max(base, 3000) : base) * (0.75 + Math.random() * 0.5)
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect() }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeat = setInterval(() => { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping' })) }, HEARTBEAT_MS)
  }
  private stopHeartbeat() { if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = null }

  /** Reconnect right away (e.g. the tab came back, or the network returned). */
  reconnectNow() {
    if (this.status === 'live' || !this.hasSubscribers()) return
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null }
    if (!this.ws && !this.connecting) this.connect()
  }

  private closeSocket() {
    this.closing = true
    this.stopHeartbeat()
    const ws = this.ws
    this.ws = null
    if (ws) { ws.onclose = null; ws.onmessage = null; ws.close(1000) }
  }

  disconnect() {
    if (this.connecting) this.cancelled = true
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null }
    this.closeSocket()
    this.attempts = 0
    this.setStatus('idle')
  }
}

export const realtime = new RealtimeClient()

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => realtime.reconnectNow())
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') realtime.reconnectNow() })
}

/** Call `handler` for each live event of the given types. The latest handler is always used. */
export function useRealtime(types: string | string[], handler: Handler, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })
  const key = Array.isArray(types) ? types.join('|') : types
  useEffect(() => {
    if (!enabled) return
    const offs = key.split('|').map((t) => realtime.subscribe(t, (m) => ref.current(m)))
    return () => offs.forEach((off) => off())
  }, [key, enabled])
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtime.onStatus, realtime.getStatus, () => 'idle')
}

/** Re-run `refresh` (debounced) when any of these events arrive, optionally filtered. */
export function useLiveRefresh(types: string | string[], refresh: () => void, { ms = 600, when }: { ms?: number; when?: (m: RealtimeMessage) => boolean } = {}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useRealtime(types, (m) => {
    if (when && !when(m)) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(refresh, ms)
  })
}
