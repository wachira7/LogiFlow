// app/platform-admin/layout.tsx
'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { PlatformAdminSidebar } from '@/components/layout/PlatformAdminSidebar'
import { Shield } from 'lucide-react'

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ✅ FIXED: Use PlatformAdminSidebar instead of regular Sidebar */}
      <PlatformAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Platform Admin Badge */}
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Platform Administrator Mode</span>
          </div>
        </div>

        {/* Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}