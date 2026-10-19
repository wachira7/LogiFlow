// src/components/analytics/ReportShell.tsx
// Loads the report for the selected period and renders a page with it (skeleton and errors handled here).
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner, StatGridSkeleton } from '@/components/app/kit'
import { useAnalyticsReport, usePeriod } from '@/hooks/useAnalytics'
import type { AnalyticsReport } from '@/types/analytics.types'

export function ReportShell({ children }: { children: (report: AnalyticsReport, days: number) => React.ReactNode }) {
  const { days } = usePeriod()
  const { report, loading, error, reload } = useAnalyticsReport(days)

  if (error && !report) return <ErrorBanner title="Couldn’t load analytics" message={error} onRetry={reload} />
  if (!report || (loading && report.period.days !== days)) {
    return (
      <div className="space-y-6" aria-busy aria-label="Loading analytics">
        <StatGridSkeleton />
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
    )
  }
  return <div className="space-y-6">{children(report, days)}</div>
}
