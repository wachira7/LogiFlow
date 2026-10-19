// src/hooks/useDashboard.ts
// Dashboard overview: loads once, refreshes every minute while the tab is visible.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DashboardService } from '@/services/dashboardService'
import type { DashboardOverview } from '@/types/dashboard.types'

const REFRESH_MS = 60_000

export function useDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsRefreshing(true)
    try {
      const res = await DashboardService.getOverview()
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error || 'Couldn’t load the dashboard.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load the dashboard.')
    } finally {
      inFlight.current = false
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { data, isLoading, isRefreshing, error, reload: load }
}
