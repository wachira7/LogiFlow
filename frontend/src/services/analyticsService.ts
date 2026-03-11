// src/services/analyticsService.ts

import { api } from './api';
import type {
  StockMovementsReport,
  WarehousingDashboard,
  MaterialRequirementsReport,
  ProductionDashboard,
  CompanyOverviewReport,
  SecurityReport,
  SystemHealthDashboard,
  SubscriptionsDashboard,
  StockReport,
  LowStockProduct,
  TrackingReport,
  DistributionDashboard,
  DashboardOverview,
  AnalyticsSummary,
} from '@/types/analytics.types';
import type { RevenueReport } from '@/types/billing.types';

// ============================================================================
// HELPER TYPES
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface BackendResponse<T> {
  results?: T;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// ============================================================================
// WAREHOUSING ANALYTICS SERVICE
// ============================================================================

export const warehousingAnalyticsService = {
  async getStockMovements(): Promise<ApiResponse<StockMovementsReport>> {
    try {
      console.log('API call: GET /api/v1/warehousing/transfers/stock_movements/');
      const response = await api.get<StockMovementsReport>('/api/v1/warehousing/transfers/stock_movements/');
      
      if (!response.success) {
        return {
          success: false,
          data: { stock_movements: [], total_movement_pairs: 0 },
          error: response.error || 'Failed to fetch stock movements',
        };
      }

      return {
        success: true,
        data: response.data || { stock_movements: [], total_movement_pairs: 0 },
      };
    } catch (error: unknown) {
      console.error('Error fetching stock movements:', error);
      return {
        success: false,
        data: { stock_movements: [], total_movement_pairs: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch stock movements',
      };
    }
  },

  async getDashboard(): Promise<ApiResponse<WarehousingDashboard>> {
    try {
      console.log('API call: GET /api/v1/warehousing/transfers/dashboard/');
      const response = await api.get<WarehousingDashboard>('/api/v1/warehousing/transfers/dashboard/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_transfers: 0,
            pending_transfers: 0,
            in_transit_transfers: 0,
            completed_transfers: 0,
            cancelled_transfers: 0,
            monthly_transfers: 0,
            monthly_completed: 0,
            average_transfer_days: 0,
            in_transit_value: 0,
          },
          error: response.error || 'Failed to fetch warehousing dashboard',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_transfers: 0,
          pending_transfers: 0,
          in_transit_transfers: 0,
          completed_transfers: 0,
          cancelled_transfers: 0,
          monthly_transfers: 0,
          monthly_completed: 0,
          average_transfer_days: 0,
          in_transit_value: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching warehousing dashboard:', error);
      return {
        success: false,
        data: {
          total_transfers: 0,
          pending_transfers: 0,
          in_transit_transfers: 0,
          completed_transfers: 0,
          cancelled_transfers: 0,
          monthly_transfers: 0,
          monthly_completed: 0,
          average_transfer_days: 0,
          in_transit_value: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch warehousing dashboard',
      };
    }
  },
};

// ============================================================================
// PRODUCTION ANALYTICS SERVICE
// ============================================================================

export const productionAnalyticsService = {
  async getMaterialRequirements(): Promise<ApiResponse<MaterialRequirementsReport>> {
    try {
      console.log('API call: GET /api/v1/production/orders/material_requirements/');
      const response = await api.get<MaterialRequirementsReport>('/api/v1/production/orders/material_requirements/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            material_requirements: [],
            total_materials: 0,
            materials_with_shortage: 0,
          },
          error: response.error || 'Failed to fetch material requirements',
        };
      }

      return {
        success: true,
        data: response.data || {
          material_requirements: [],
          total_materials: 0,
          materials_with_shortage: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching material requirements:', error);
      return {
        success: false,
        data: {
          material_requirements: [],
          total_materials: 0,
          materials_with_shortage: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch material requirements',
      };
    }
  },

  async getDashboard(): Promise<ApiResponse<ProductionDashboard>> {
    try {
      console.log('API call: GET /api/v1/production/orders/dashboard/');
      const response = await api.get<ProductionDashboard>('/api/v1/production/orders/dashboard/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_orders: 0,
            planned_orders: 0,
            in_progress_orders: 0,
            completed_orders: 0,
            cancelled_orders: 0,
            overdue_orders: 0,
            monthly_completed: 0,
          },
          error: response.error || 'Failed to fetch production dashboard',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_orders: 0,
          planned_orders: 0,
          in_progress_orders: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          overdue_orders: 0,
          monthly_completed: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching production dashboard:', error);
      return {
        success: false,
        data: {
          total_orders: 0,
          planned_orders: 0,
          in_progress_orders: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          overdue_orders: 0,
          monthly_completed: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch production dashboard',
      };
    }
  },
};

// ============================================================================
// PLATFORM ADMIN ANALYTICS SERVICE
// ============================================================================

export const platformAdminAnalyticsService = {
  async getCompanyOverview(): Promise<ApiResponse<CompanyOverviewReport>> {
    try {
      console.log('API call: GET /api/v1/platform-admin/analytics/company_overview/');
      const response = await api.get<CompanyOverviewReport>('/api/v1/platform-admin/analytics/company_overview/');
      
      if (!response.success) {
        return {
          success: false,
          data: { companies: [], total_count: 0 },
          error: response.error || 'Failed to fetch company overview',
        };
      }

      return {
        success: true,
        data: response.data || { companies: [], total_count: 0 },
      };
    } catch (error: unknown) {
      console.error('Error fetching company overview:', error);
      return {
        success: false,
        data: { companies: [], total_count: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch company overview',
      };
    }
  },

  async getSecurityReport(): Promise<ApiResponse<SecurityReport>> {
    try {
      console.log('API call: GET /api/v1/platform-admin/audit-logs/security_report/');
      const response = await api.get<SecurityReport>('/api/v1/platform-admin/audit-logs/security_report/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_audit_entries: 0,
            recent_activity_24h: 0,
            action_breakdown: {
              company_created: 0,
              company_suspended: 0,
              company_activated: 0,
              subscription_modified: 0,
              user_impersonated: 0,
              settings_changed: 0,
              system_maintenance: 0,
            },
            most_active_admins: [],
            security_alerts: [],
          },
          error: response.error || 'Failed to fetch security report',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_audit_entries: 0,
          recent_activity_24h: 0,
          action_breakdown: {
            company_created: 0,
            company_suspended: 0,
            company_activated: 0,
            subscription_modified: 0,
            user_impersonated: 0,
            settings_changed: 0,
            system_maintenance: 0,
          },
          most_active_admins: [],
          security_alerts: [],
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching security report:', error);
      return {
        success: false,
        data: {
          total_audit_entries: 0,
          recent_activity_24h: 0,
          action_breakdown: {
            company_created: 0,
            company_suspended: 0,
            company_activated: 0,
            subscription_modified: 0,
            user_impersonated: 0,
            settings_changed: 0,
            system_maintenance: 0,
          },
          most_active_admins: [],
          security_alerts: [],
        },
        error: error instanceof Error ? error.message : 'Failed to fetch security report',
      };
    }
  },

  async getSystemHealth(): Promise<ApiResponse<SystemHealthDashboard>> {
    try {
      console.log('API call: GET /api/v1/platform-admin/system-health/dashboard/');
      const response = await api.get<SystemHealthDashboard>('/api/v1/platform-admin/system-health/dashboard/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            overall_status: 'UNKNOWN',
            cpu_usage: 0,
            memory_usage: 0,
            disk_usage: 0,
            active_connections: 0,
            response_time_avg: 0,
            error_rate: 0,
            uptime_percentage: 0,
          },
          error: response.error || 'Failed to fetch system health',
        };
      }

      return {
        success: true,
        data: response.data || {
          overall_status: 'UNKNOWN',
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          active_connections: 0,
          response_time_avg: 0,
          error_rate: 0,
          uptime_percentage: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching system health:', error);
      return {
        success: false,
        data: {
          overall_status: 'UNKNOWN',
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          active_connections: 0,
          response_time_avg: 0,
          error_rate: 0,
          uptime_percentage: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch system health',
      };
    }
  },
};

// ============================================================================
// PAYMENTS/FINANCIAL ANALYTICS SERVICE
// ============================================================================

export const financialAnalyticsService = {
  async getSubscriptionsDashboard(): Promise<ApiResponse<SubscriptionsDashboard>> {
    try {
      console.log('API call: GET /api/v1/payments/subscriptions/dashboard/');
      const response = await api.get<SubscriptionsDashboard>('/api/v1/payments/subscriptions/dashboard/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_subscriptions: 0,
            active_subscriptions: 0,
            trial_subscriptions: 0,
            cancelled_subscriptions: 0,
            expired_subscriptions: 0,
            total_revenue: 0,
            monthly_revenue: 0,
            next_billing_date: null,
          },
          error: response.error || 'Failed to fetch subscriptions dashboard',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_subscriptions: 0,
          active_subscriptions: 0,
          trial_subscriptions: 0,
          cancelled_subscriptions: 0,
          expired_subscriptions: 0,
          total_revenue: 0,
          monthly_revenue: 0,
          next_billing_date: null,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching subscriptions dashboard:', error);
      return {
        success: false,
        data: {
          total_subscriptions: 0,
          active_subscriptions: 0,
          trial_subscriptions: 0,
          cancelled_subscriptions: 0,
          expired_subscriptions: 0,
          total_revenue: 0,
          monthly_revenue: 0,
          next_billing_date: null,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch subscriptions dashboard',
      };
    }
  },

  async getRevenueReport(): Promise<ApiResponse<RevenueReport>> {
    try {
      console.log('API call: GET /api/v1/payments/transactions/revenue_report/');
      const response = await api.get<RevenueReport>('/api/v1/payments/transactions/revenue_report/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_revenue: 0,
            provider_revenue: {
              stripe: 0,
              mpesa: 0,
              crypto: 0,
            },
            monthly_revenue: [],
            transaction_count: 0,
          },
          error: response.error || 'Failed to fetch revenue report',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_revenue: 0,
          provider_revenue: {
            stripe: 0,
            mpesa: 0,
            crypto: 0,
          },
          monthly_revenue: [],
          transaction_count: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching revenue report:', error);
      return {
        success: false,
        data: {
          total_revenue: 0,
          provider_revenue: {
            stripe: 0,
            mpesa: 0,
            crypto: 0,
          },
          monthly_revenue: [],
          transaction_count: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch revenue report',
      };
    }
  },
};

// ============================================================================
// INVENTORY ANALYTICS SERVICE
// ============================================================================

export const inventoryAnalyticsService = {
  async getStockReport(): Promise<ApiResponse<StockReport>> {
    try {
      console.log('API call: GET /api/v1/inventory/products/stock_report/');
      const response = await api.get<StockReport>('/api/v1/inventory/products/stock_report/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_products: 0,
            active_products: 0,
            inactive_products: 0,
            low_stock_products: 0,
            total_stock_value: 0,
          },
          error: response.error || 'Failed to fetch stock report',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_products: 0,
          active_products: 0,
          inactive_products: 0,
          low_stock_products: 0,
          total_stock_value: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching stock report:', error);
      return {
        success: false,
        data: {
          total_products: 0,
          active_products: 0,
          inactive_products: 0,
          low_stock_products: 0,
          total_stock_value: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch stock report',
      };
    }
  },

  async getLowStockProducts(): Promise<ApiResponse<LowStockProduct[]>> {
    try {
      console.log('API call: GET /api/v1/inventory/products/low_stock/');
      const response = await api.get<BackendResponse<LowStockProduct[]>>('/api/v1/inventory/products/low_stock/');
      
      if (!response.success) {
        return {
          success: false,
          data: [],
          error: response.error || 'Failed to fetch low stock products',
        };
      }

      const products = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || [];

      return {
        success: true,
        data: products,
      };
    } catch (error: unknown) {
      console.error('Error fetching low stock products:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch low stock products',
      };
    }
  },
};

// ============================================================================
// DISTRIBUTION ANALYTICS SERVICE
// ============================================================================

export const distributionAnalyticsService = {
  async getTrackingReport(): Promise<ApiResponse<TrackingReport>> {
    try {
      console.log('API call: GET /api/v1/distribution/shipments/tracking_report/');
      const response = await api.get<TrackingReport>('/api/v1/distribution/shipments/tracking_report/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_shipments: 0,
            on_time_percentage: 0,
            pending_shipments: 0,
            picked_shipments: 0,
            packed_shipments: 0,
            shipped_shipments: 0,
            delivered_shipments: 0,
            delayed_shipments: 0,
            average_delivery_days: 0,
          },
          error: response.error || 'Failed to fetch tracking report',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_shipments: 0,
          on_time_percentage: 0,
          pending_shipments: 0,
          picked_shipments: 0,
          packed_shipments: 0,
          shipped_shipments: 0,
          delivered_shipments: 0,
          delayed_shipments: 0,
          average_delivery_days: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching tracking report:', error);
      return {
        success: false,
        data: {
          total_shipments: 0,
          on_time_percentage: 0,
          pending_shipments: 0,
          picked_shipments: 0,
          packed_shipments: 0,
          shipped_shipments: 0,
          delivered_shipments: 0,
          delayed_shipments: 0,
          average_delivery_days: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch tracking report',
      };
    }
  },

  async getDashboard(): Promise<ApiResponse<DistributionDashboard>> {
    try {
      console.log('API call: GET /api/v1/distribution/orders/dashboard/');
      const response = await api.get<DistributionDashboard>('/api/v1/distribution/orders/dashboard/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            total_orders: 0,
            new_orders: 0,
            processing_orders: 0,
            shipped_orders: 0,
            delivered_orders: 0,
            cancelled_orders: 0,
            total_revenue: 0,
            monthly_orders: 0,
            monthly_revenue: 0,
          },
          error: response.error || 'Failed to fetch distribution dashboard',
        };
      }

      return {
        success: true,
        data: response.data || {
          total_orders: 0,
          new_orders: 0,
          processing_orders: 0,
          shipped_orders: 0,
          delivered_orders: 0,
          cancelled_orders: 0,
          total_revenue: 0,
          monthly_orders: 0,
          monthly_revenue: 0,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching distribution dashboard:', error);
      return {
        success: false,
        data: {
          total_orders: 0,
          new_orders: 0,
          processing_orders: 0,
          shipped_orders: 0,
          delivered_orders: 0,
          cancelled_orders: 0,
          total_revenue: 0,
          monthly_orders: 0,
          monthly_revenue: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch distribution dashboard',
      };
    }
  },
};

// ============================================================================
// DASHBOARD OVERVIEW SERVICE
// ============================================================================

export const dashboardService = {
  async getOverview(): Promise<ApiResponse<DashboardOverview>> {
    try {
      console.log('API call: GET /api/v1/auth/dashboard/overview/');
      const response = await api.get<DashboardOverview>('/api/v1/auth/dashboard/overview/');
      
      if (!response.success) {
        return {
          success: false,
          data: {
            company: {
              id: '',
              name: '',
              industry: '',
              created_at: '',
              logo: '',
              email: '',
            },
            user: {
              id: '',
              name: '',
              email: '',
              role: '',
              joined_at: '',
            },
            stats: {
              total_users: 0,
              total_products: 0,
              pending_orders: 0,
              active_shipments: 0,
              days_active: 0,
            },
            recent_activity: [],
            quick_actions: [],
            setup_progress: {
              completed_steps: 0,
              total_steps: 0,
              steps: [],
            },
          },
          error: response.error || 'Failed to fetch dashboard overview',
        };
      }

      return {
        success: true,
        data: response.data || {
          company: {
            id: '',
            name: '',
            industry: '',
            created_at: '',
            logo: '',
            email: '',
          },
          user: {
            id: '',
            name: '',
            email: '',
            role: '',
            joined_at: '',
          },
          stats: {
            total_users: 0,
            total_products: 0,
            pending_orders: 0,
            active_shipments: 0,
            days_active: 0,
          },
          recent_activity: [],
          quick_actions: [],
          setup_progress: {
            completed_steps: 0,
            total_steps: 0,
            steps: [],
          },
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching dashboard overview:', error);
      return {
        success: false,
        data: {
          company: {
            id: '',
            name: '',
            industry: '',
            created_at: '',
            logo: '',
            email: '',
          },
          user: {
            id: '',
            name: '',
            email: '',
            role: '',
            joined_at: '',
          },
          stats: {
            total_users: 0,
            total_products: 0,
            pending_orders: 0,
            active_shipments: 0,
            days_active: 0,
          },
          recent_activity: [],
          quick_actions: [],
          setup_progress: {
            completed_steps: 0,
            total_steps: 0,
            steps: [],
          },
        },
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard overview',
      };
    }
  },
};

// ============================================================================
// COMBINED ANALYTICS SERVICE
// ============================================================================

export const analyticsService = {
  async getAnalyticsSummary(): Promise<ApiResponse<AnalyticsSummary>> {
    try {
      console.log('Fetching comprehensive analytics summary...');
      
      const [
        inventory,
        distribution,
        production,
        warehousing,
        financial,
        subscriptions,
      ] = await Promise.all([
        inventoryAnalyticsService.getStockReport(),
        distributionAnalyticsService.getDashboard(),
        productionAnalyticsService.getDashboard(),
        warehousingAnalyticsService.getDashboard(),
        financialAnalyticsService.getRevenueReport(),
        financialAnalyticsService.getSubscriptionsDashboard(),
      ]);

      return {
        success: true,
        data: {
          inventory: inventory.data,
          distribution: distribution.data,
          production: production.data,
          warehousing: warehousing.data,
          financial: financial.data,
          subscriptions: subscriptions.data,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching analytics summary:', error);
      return {
        success: false,
        data: {
          inventory: {
            total_products: 0,
            active_products: 0,
            inactive_products: 0,
            low_stock_products: 0,
            total_stock_value: 0,
          },
          distribution: {
            total_orders: 0,
            new_orders: 0,
            processing_orders: 0,
            shipped_orders: 0,
            delivered_orders: 0,
            cancelled_orders: 0,
            total_revenue: 0,
            monthly_orders: 0,
            monthly_revenue: 0,
          },
          production: {
            total_orders: 0,
            planned_orders: 0,
            in_progress_orders: 0,
            completed_orders: 0,
            cancelled_orders: 0,
            overdue_orders: 0,
            monthly_completed: 0,
          },
          warehousing: {
            total_transfers: 0,
            pending_transfers: 0,
            in_transit_transfers: 0,
            completed_transfers: 0,
            cancelled_transfers: 0,
            monthly_transfers: 0,
            monthly_completed: 0,
            average_transfer_days: 0,
            in_transit_value: 0,
          },
          financial: {
            total_revenue: 0,
            provider_revenue: {
              stripe: 0,
              mpesa: 0,
              crypto: 0,
            },
            monthly_revenue: [],
            transaction_count: 0,
          },
          subscriptions: {
            total_subscriptions: 0,
            active_subscriptions: 0,
            trial_subscriptions: 0,
            cancelled_subscriptions: 0,
            expired_subscriptions: 0,
            total_revenue: 0,
            monthly_revenue: 0,
            next_billing_date: null,
          },
        },
        error: error instanceof Error ? error.message : 'Failed to fetch analytics summary',
      };
    }
  },

  // Re-export individual services for convenience
  inventory: inventoryAnalyticsService,
  distribution: distributionAnalyticsService,
  production: productionAnalyticsService,
  warehousing: warehousingAnalyticsService,
  financial: financialAnalyticsService,
  platformAdmin: platformAdminAnalyticsService,
  dashboard: dashboardService,
};

export default analyticsService;