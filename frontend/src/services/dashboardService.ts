// services/dashboardService.ts
import { api } from './api'
import type { ApiResponse } from './api'
import type { DashboardOverview } from '@/types/dashboard.types'

// Temporary mock data generator for fields not yet implemented in backend
const generateMockFields = () => {
  const setupSteps = [
    {
      id: 1,
      title: 'Complete Company Profile',
      completed: Math.random() > 0.3, // 70% chance completed
      description: 'Add your company details and logo'
    },
    {
      id: 2,
      title: 'Invite Team Members',
      completed: Math.random() > 0.6, // 40% chance completed
      description: 'Add users to your organization'
    },
    {
      id: 3,
      title: 'Set Up Inventory',
      completed: Math.random() > 0.8, // 20% chance completed
      description: 'Add your first products and warehouses'
    },
    {
      id: 4,
      title: 'Configure Settings',
      completed: Math.random() > 0.7, // 30% chance completed
      description: 'Customize your preferences and integrations'
    }
  ]

  const completedSteps = setupSteps.filter(step => step.completed).length

  return {
    performance_metrics: [
      {
        title: 'Order Processing Time',
        value: '2.4 hrs',
        change: '+12%',
        trend: 'up' as const,
        description: 'Average time to process orders'
      },
      {
        title: 'Inventory Turnover',
        value: '4.2x',
        change: '+8%',
        trend: 'up' as const,
        description: 'Times per year inventory is sold'
      },
      {
        title: 'Delivery Success Rate',
        value: '98.5%',
        change: '+2%',
        trend: 'up' as const,
        description: 'Successful deliveries this month'
      },
      {
        title: 'Customer Satisfaction',
        value: '4.8/5',
        change: '-0.1',
        trend: 'down' as const,
        description: 'Average customer rating'
      }
    ],
    alerts: [
      {
        id: 1,
        type: 'warning' as const,
        title: 'Low Stock Alert',
        message: 'Some products are running low on inventory',
        timestamp: new Date().toISOString(),
        action: 'View Inventory'
      },
      {
        id: 2,
        type: 'info' as const,
        title: 'Setup Progress',
        message: completedSteps === setupSteps.length 
          ? 'Setup complete! You can now use all features.'
          : `Complete ${setupSteps.length - completedSteps} more setup steps`,
        timestamp: new Date().toISOString(),
        action: 'Continue Setup'
      },
      ...(completedSteps < setupSteps.length ? [{
        id: 3,
        type: 'success' as const,
        title: 'Getting Started',
        message: 'Welcome to LogiFlow! Complete setup to unlock all features.',
        timestamp: new Date().toISOString(),
        action: 'View Guide'
      }] : [])
    ],
    setup_progress: {
      completed_steps: completedSteps,
      total_steps: setupSteps.length,
      steps: setupSteps
    }
  }
}

export class DashboardService {
  /**
   * Get dashboard overview data
   */
  static async getOverview(): Promise<ApiResponse<DashboardOverview>> {
    try {
      const response = await api.get<DashboardOverview>('/api/v1/auth/dashboard/overview/')

      if (response.success && response.data) {
        // Only add mock data for fields that don't exist in the backend response
        const mockFields = generateMockFields()
        const enhancedData = {
          ...response.data,
          // Only add performance_metrics if not provided by backend
          ...(response.data.performance_metrics ? {} : { performance_metrics: mockFields.performance_metrics }),
          // Only add alerts if not provided by backend
          ...(response.data.alerts ? {} : { alerts: mockFields.alerts }),
          // Only add setup_progress if not provided by backend
          ...(response.data.setup_progress ? {} : { setup_progress: mockFields.setup_progress }),
        }

        console.log('Dashboard overview loaded successfully')
        return {
          ...response,
          data: enhancedData
        }
      }

      return response
    } catch (error) {
      console.error('Failed to fetch dashboard overview:', error)
      
      // Handle different types of errors
      let errorMessage = 'Failed to load dashboard data'
      let statusCode = 500
      
      if (error && typeof error === 'object') {
        // Handle rate limiting
        if ('status' in error && error.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.'
          statusCode = 429
        }
        // Handle network errors
        else if ('message' in error && typeof error.message === 'string') {
          if (error.message.includes('fetch')) {
            errorMessage = 'Unable to connect to server. Please check your connection.'
          } else {
            errorMessage = error.message
          }
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        status: statusCode,
      }
    }
  }

  /**
   * Refresh dashboard data
   */
  static async refreshOverview(): Promise<ApiResponse<DashboardOverview>> {
    console.log('Refreshing dashboard data...')
    return this.getOverview()
  }

  /**
   * Get dashboard stats only
   */
  static async getStats(): Promise<ApiResponse<DashboardOverview['stats']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.stats,
          message: 'Dashboard stats loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load dashboard stats',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load dashboard stats',
        status: 500
      }
    }
  }
  
  /**
   * Get recent activity only
   */
  static async getRecentActivity(): Promise<ApiResponse<DashboardOverview['recent_activity']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.recent_activity,
          message: 'Recent activity loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load recent activity',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load recent activity',
        status: 500
      }
    }
  }

  /**
   * Get quick actions only
   */
  static async getQuickActions(): Promise<ApiResponse<DashboardOverview['quick_actions']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.quick_actions,
          message: 'Quick actions loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load quick actions',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch quick actions:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load quick actions',
        status: 500
      }
    }
  }

  /**
   * Get performance metrics only
   */
  static async getPerformanceMetrics(): Promise<ApiResponse<DashboardOverview['performance_metrics']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.performance_metrics,
          message: 'Performance metrics loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load performance metrics',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load performance metrics',
        status: 500
      }
    }
  }

  /**
   * Get alerts only
   */
  static async getAlerts(): Promise<ApiResponse<DashboardOverview['alerts']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.alerts,
          message: 'Alerts loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load alerts',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load alerts',
        status: 500
      }
    }
  }

  /**
   * Get setup progress only
   */
  static async getSetupProgress(): Promise<ApiResponse<DashboardOverview['setup_progress']>> {
    try {
      const overview = await this.getOverview()
      
      if (overview.success && overview.data) {
        return {
          success: true,
          data: overview.data.setup_progress,
          message: 'Setup progress loaded successfully',
          status: 200
        }
      }
      
      return {
        success: false,
        data: undefined,
        error: overview.error || 'Failed to load setup progress',
        status: overview.status || 500
      }
    } catch (error) {
      console.error('Failed to fetch setup progress:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to load setup progress',
        status: 500
      }
    }
  }

  /**
   * Update setup step completion (for when you implement real functionality)
   */
  static async updateSetupStep(stepId: number, completed: boolean): Promise<ApiResponse<{ step_id: number, completed: boolean }>> {
    console.log(`Updating setup step ${stepId} to completed: ${completed}`)
    try {
      // TODO: Implement actual API call when ready
      console.log(`Updating setup step ${stepId} to completed: ${completed}`)
      
      // For now, just return success - replace with real API call later
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
      
      return {
        success: true,
        data: { step_id: stepId, completed },
        message: `Setup step ${completed ? 'completed' : 'uncompleted'} successfully`,
        status: 200
      }
      
      /* Future implementation when backend endpoint is ready:
      const response = await api.patch(`/api/v1/auth/setup-progress/${stepId}/`, {
        completed
      })
      return response
      */
    } catch (error) {
      console.error('Failed to update setup step:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update setup step',
        status: 500,
      }
    }
  }

  /**
   * Mark all alerts as read
   */
  static async markAlertsAsRead(alertIds: number[]): Promise<ApiResponse<{ marked_read: number[] }>> {
    console.log(`Marking alerts as read: ${alertIds.join(', ')}`)
    try {
      // TODO: Implement actual API call when ready
      console.log(`Marking alerts as read: ${alertIds.join(', ')}`)
      
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate network delay
      
      return {
        success: true,
        data: { marked_read: alertIds },
        message: 'Alerts marked as read successfully',
        status: 200
      }
      
      /* Future implementation:
      const response = await api.post('/api/v1/auth/alerts/mark-read/', {
        alert_ids: alertIds
      })
      return response
      */
    } catch (error) {
      console.error('Failed to mark alerts as read:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark alerts as read',
        status: 500,
      }
    }
  }
}