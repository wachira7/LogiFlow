//src/app/platform-admin/audit-logs/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { AuditLogViewer } from '@/components/platform-admin/AuditLogViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'

export default function AuditLogsPage() {
  const {
    auditLogs,
    securityReport,
    isLoadingAuditLogs,
    fetchAuditLogs,
    fetchSecurityReport,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchAuditLogs()
    fetchSecurityReport()
  }, [fetchAuditLogs, fetchSecurityReport])

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Shield className="w-8 h-8" />
            <span>Audit Logs</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform administrator actions and security events
          </p>
        </div>
      </div>

      <AuditLogViewer
        logs={auditLogs}
        securityReport={securityReport}
        isLoading={isLoadingAuditLogs}
        onRefresh={() => {
          fetchAuditLogs()
          fetchSecurityReport()
        }}
      />
    </div>
  )
}