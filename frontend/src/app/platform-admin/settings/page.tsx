// frontend/src/app/platform-admin/settings/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
//import { PrivateRoute } from '@/components/auth/AuthGuard'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { PlatformSettings } from '@/components/platform-admin/PlatformSettings'
import { AuditLogViewer } from '@/components/platform-admin/AuditLogViewer'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Settings, Shield, AlertCircle } from 'lucide-react'
function SettingsPageContent() {
  const {
    settings,
    isLoadingSettings,
    settingsError,
    auditLogs,
    securityReport,
    isLoadingAuditLogs,
    fetchSettings,
    createSetting,
    updateSetting,
    deleteSetting,
    fetchAuditLogs,
    fetchSecurityReport,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchSettings()
    fetchAuditLogs()
    fetchSecurityReport()
  }, [fetchSettings, fetchAuditLogs, fetchSecurityReport])

  if (settingsError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{settingsError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Settings className="w-8 h-8" />
              <span>Platform Administration</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure platform settings and view security logs
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="space-x-2">
            <Shield className="w-4 h-4" />
            <span>Audit Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <PlatformSettings
            settings={settings}
            isLoading={isLoadingSettings}
            onCreateSetting={createSetting}
            onUpdateSetting={updateSetting}
            onDeleteSetting={deleteSetting}
            onRefresh={fetchSettings}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLogViewer
            logs={auditLogs}
            securityReport={securityReport}
            isLoading={isLoadingAuditLogs}
            onRefresh={() => {
              fetchAuditLogs()
              fetchSecurityReport()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return <SettingsPageContent />
}
