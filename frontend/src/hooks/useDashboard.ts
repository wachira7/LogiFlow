// hooks/useDashboard.ts - Fixed TypeScript errors
'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardService } from '@/services/dashboardService'
import type { DashboardOverview } from '@/types/dashboard.types'
import type { ApiResponse } from '@/services/api'

interface DashboardState {
  data: DashboardOverview | null
  isLoading: boolean
  error: string | null
}

// Global cache to prevent multiple simultaneous API calls
const dashboardCache: {
  data: DashboardOverview | null
  timestamp: number
  promise: Promise<ApiResponse<DashboardOverview>> | null
} = {
  data: null,
  timestamp: 0,
  promise: null
}

const CACHE_DURATION = 30000 // 30 seconds cache
const MIN_REQUEST_INTERVAL = 1000 // Minimum 1 second between requests

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null,
  })

  const lastRequestTime = useRef<number>(0)
  const mountedRef = useRef<boolean>(true)

  const loadDashboard = async (force: boolean = false) => {
    // Prevent rapid successive calls
    const now = Date.now()
    if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL && !force) {
      return
    }

    // Check cache first
    if (!force && dashboardCache.data && (now - dashboardCache.timestamp) < CACHE_DURATION) {
      if (mountedRef.current) {
        setState({
          data: dashboardCache.data,
          isLoading: false,
          error: null,
        })
      }
      return
    }

    // If there's already a request in progress, wait for it
    if (dashboardCache.promise && !force) {
      try {
        const response = await dashboardCache.promise
        if (mountedRef.current && response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        if (mountedRef.current) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load dashboard data',
          })
        }
      }
      return
    }

    lastRequestTime.current = now

    if (mountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    }
    
    try {
      // Create and store the promise to prevent duplicate requests
      dashboardCache.promise = DashboardService.getOverview()
      const response = await dashboardCache.promise
      
      if (response.success && response.data) {
        // Update cache
        dashboardCache.data = response.data
        dashboardCache.timestamp = now
        
        if (mountedRef.current) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          })
        }
      } else {
        const errorMessage = response.error || 'Failed to load dashboard data'
        
        if (mountedRef.current) {
          setState({
            data: null,
            isLoading: false,
            error: errorMessage,
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error('Dashboard fetch error:', error)
      
      if (mountedRef.current) {
        setState({
          data: null,
          isLoading: false,
          error: errorMessage,
        })
      }
    } finally {
      // Clear the promise after completion
      dashboardCache.promise = null
    }
  }

  const refreshDashboard = async () => {
    await loadDashboard(true) // Force refresh
  }

  useEffect(() => {
    mountedRef.current = true
    loadDashboard()

    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    refreshDashboard,
    reload: () => loadDashboard(true),
  }
}