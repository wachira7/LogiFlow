// src/services/dashboardService.ts
import { api, type ApiResponse } from './api'
import type { DashboardOverview } from '@/types/dashboard.types'

export class DashboardService {
  /** Everything the dashboard shows, computed by the API from the company's real data. */
  static async getOverview(): Promise<ApiResponse<DashboardOverview>> {
    try {
      return await api.get<DashboardOverview>('/api/v1/auth/dashboard/overview/')
    } catch (error) {
      const offline = error instanceof Error && error.message.includes('fetch')
      return {
        success: false,
        error: offline ? 'Can’t reach the server. Check your connection.' : 'Couldn’t load the dashboard.',
        status: 0,
      }
    }
  }
}
