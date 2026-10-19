// src/services/analyticsService.ts
import { api } from './api'
import type { AnalyticsReport, Period } from '@/types/analytics.types'

export const analyticsService = {
  /** Company-wide analytics for the last `days` days, compared with the period before. */
  async getReport(days: Period): Promise<AnalyticsReport> {
    const res = await api.get<AnalyticsReport>('/api/v1/analytics/report/', { days: String(days) })
    if (!res.success || !res.data) throw new Error(res.error || 'Couldn’t load analytics.')
    return res.data
  },
}
