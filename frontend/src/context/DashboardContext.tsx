// context/DashboardContext.tsx
'use client'

import React, { createContext, useContext } from 'react'
import { useDashboard as useInternalDashboard } from '@/hooks/useDashboard'
import type { DashboardOverview } from '@/types/dashboard.types'

interface DashboardContextType {
  data: DashboardOverview | null
  isLoading: boolean
  error: string | null
  refreshDashboard: () => Promise<void>
  reload: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | null>(null)

interface DashboardProviderProps {
  children: React.ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const dashboardState = useInternalDashboard()

  return (
    <DashboardContext.Provider value={dashboardState}>
      {children}
    </DashboardContext.Provider>
  )
}

// Custom hook to use dashboard context
export function useDashboard(): DashboardContextType {
  const context = useContext(DashboardContext)
  
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  
  return context
}