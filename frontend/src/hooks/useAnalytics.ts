// src/hooks/useAnalytics.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { analyticsService } from '@/services/analyticsService'
import type { AnalyticsReport, Period } from '@/types/analytics.types'

const PERIODS: Period[] = [7, 30, 90]

/** The selected period lives in the URL (?days=) so links and refreshes keep it. */
export function usePeriod() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const raw = Number(params.get('days'))
  const days: Period = (PERIODS as number[]).includes(raw) ? (raw as Period) : 30
  const setDays = (d: Period) => router.replace(d === 30 ? pathname : `${pathname}?days=${d}`, { scroll: false })
  return { days, setDays, periods: PERIODS }
}

export function useAnalyticsReport(days: Period) {
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await analyticsService.getReport(days))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load analytics.')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return { report, loading, error, reload: load }
}
