// src/hooks/useAnalytics.ts

import { useState, useEffect, useCallback } from 'react';
import analyticsService from '@/services/analyticsService';
import type {
  StockMovementsReport,
  WarehousingDashboard,
  MaterialRequirementsReport,
  ProductionDashboard,
  CompanyOverviewReport,
  SecurityReport,
  SystemHealthDashboard,
  SubscriptionsDashboard,
  RevenueReport,
  StockReport,
  LowStockProduct,
  TrackingReport,
  DistributionDashboard,
  DashboardOverview,
  AnalyticsSummary,
} from '@/types/analytics.types';

// ============================================================================
// INVENTORY ANALYTICS HOOKS
// ============================================================================

export function useInventoryAnalytics() {
  const [stockReport, setStockReport] = useState<StockReport>({
    total_products: 0,
    active_products: 0,
    inactive_products: 0,
    low_stock_products: 0,
    total_stock_value: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [stockResponse, lowStockResponse] = await Promise.all([
        analyticsService.inventory.getStockReport(),
        analyticsService.inventory.getLowStockProducts(),
      ]);

      if (stockResponse.success) {
        setStockReport(stockResponse.data);
      }

      if (lowStockResponse.success) {
        setLowStockProducts(lowStockResponse.data);
      }

      if (!stockResponse.success && !lowStockResponse.success) {
        setError('Failed to fetch inventory analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryAnalytics();
  }, [fetchInventoryAnalytics]);

  return {
    stockReport,
    lowStockProducts,
    loading,
    error,
    refetch: fetchInventoryAnalytics,
  };
}

// ============================================================================
// DISTRIBUTION ANALYTICS HOOKS
// ============================================================================

export function useDistributionAnalytics() {
  const [dashboard, setDashboard] = useState<DistributionDashboard>({
    total_orders: 0,
    new_orders: 0,
    processing_orders: 0,
    shipped_orders: 0,
    delivered_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
    monthly_orders: 0,
    monthly_revenue: 0,
  });
  const [trackingReport, setTrackingReport] = useState<TrackingReport>({
    pending_shipments: 0,
    picked_shipments: 0,
    packed_shipments: 0,
    shipped_shipments: 0,
    delivered_shipments: 0,
    delayed_shipments: 0,
    average_delivery_days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistributionAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardResponse, trackingResponse] = await Promise.all([
        analyticsService.distribution.getDashboard(),
        analyticsService.distribution.getTrackingReport(),
      ]);

      if (dashboardResponse.success) {
        setDashboard(dashboardResponse.data);
      }

      if (trackingResponse.success) {
        setTrackingReport(trackingResponse.data);
      }

      if (!dashboardResponse.success && !trackingResponse.success) {
        setError('Failed to fetch distribution analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch distribution analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistributionAnalytics();
  }, [fetchDistributionAnalytics]);

  return {
    dashboard,
    trackingReport,
    loading,
    error,
    refetch: fetchDistributionAnalytics,
  };
}

// ============================================================================
// PRODUCTION ANALYTICS HOOKS
// ============================================================================

export function useProductionAnalytics() {
  const [dashboard, setDashboard] = useState<ProductionDashboard>({
    total_orders: 0,
    planned_orders: 0,
    in_progress_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    overdue_orders: 0,
    monthly_completed: 0,
  });
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementsReport>({
    material_requirements: [],
    total_materials: 0,
    materials_with_shortage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardResponse, materialsResponse] = await Promise.all([
        analyticsService.production.getDashboard(),
        analyticsService.production.getMaterialRequirements(),
      ]);

      if (dashboardResponse.success) {
        setDashboard(dashboardResponse.data);
      }

      if (materialsResponse.success) {
        setMaterialRequirements(materialsResponse.data);
      }

      if (!dashboardResponse.success && !materialsResponse.success) {
        setError('Failed to fetch production analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch production analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductionAnalytics();
  }, [fetchProductionAnalytics]);

  return {
    dashboard,
    materialRequirements,
    loading,
    error,
    refetch: fetchProductionAnalytics,
  };
}

// ============================================================================
// WAREHOUSING ANALYTICS HOOKS
// ============================================================================

export function useWarehousingAnalytics() {
  const [dashboard, setDashboard] = useState<WarehousingDashboard>({
    total_transfers: 0,
    pending_transfers: 0,
    in_transit_transfers: 0,
    completed_transfers: 0,
    cancelled_transfers: 0,
    monthly_transfers: 0,
    monthly_completed: 0,
    average_transfer_days: 0,
    in_transit_value: 0,
  });
  const [stockMovements, setStockMovements] = useState<StockMovementsReport>({
    stock_movements: [],
    total_movement_pairs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehousingAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardResponse, movementsResponse] = await Promise.all([
        analyticsService.warehousing.getDashboard(),
        analyticsService.warehousing.getStockMovements(),
      ]);

      if (dashboardResponse.success) {
        setDashboard(dashboardResponse.data);
      }

      if (movementsResponse.success) {
        setStockMovements(movementsResponse.data);
      }

      if (!dashboardResponse.success && !movementsResponse.success) {
        setError('Failed to fetch warehousing analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch warehousing analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehousingAnalytics();
  }, [fetchWarehousingAnalytics]);

  return {
    dashboard,
    stockMovements,
    loading,
    error,
    refetch: fetchWarehousingAnalytics,
  };
}

// ============================================================================
// FINANCIAL ANALYTICS HOOKS
// ============================================================================

export function useFinancialAnalytics() {
  const [revenueReport, setRevenueReport] = useState<RevenueReport>({
    total_revenue: 0,
    provider_revenue: {
      stripe: 0,
      mpesa: 0,
      crypto: 0,
    },
    monthly_revenue: [],
    transaction_count: 0,
  });
  const [subscriptionsDashboard, setSubscriptionsDashboard] = useState<SubscriptionsDashboard>({
    total_subscriptions: 0,
    active_subscriptions: 0,
    trial_subscriptions: 0,
    cancelled_subscriptions: 0,
    expired_subscriptions: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    next_billing_date: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [revenueResponse, subscriptionsResponse] = await Promise.all([
        analyticsService.financial.getRevenueReport(),
        analyticsService.financial.getSubscriptionsDashboard(),
      ]);

      if (revenueResponse.success) {
        setRevenueReport(revenueResponse.data);
      }

      if (subscriptionsResponse.success) {
        setSubscriptionsDashboard(subscriptionsResponse.data);
      }

      if (!revenueResponse.success && !subscriptionsResponse.success) {
        setError('Failed to fetch financial analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialAnalytics();
  }, [fetchFinancialAnalytics]);

  return {
    revenueReport,
    subscriptionsDashboard,
    loading,
    error,
    refetch: fetchFinancialAnalytics,
  };
}

// ============================================================================
// PLATFORM ADMIN ANALYTICS HOOKS
// ============================================================================

export function usePlatformAdminAnalytics() {
  const [companyOverview, setCompanyOverview] = useState<CompanyOverviewReport>({
    companies: [],
    total_count: 0,
  });
  const [securityReport, setSecurityReport] = useState<SecurityReport>({
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
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthDashboard>({
    overall_status: 'UNKNOWN',
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    active_connections: 0,
    response_time_avg: 0,
    error_rate: 0,
    uptime_percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformAdminAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [companyResponse, securityResponse, healthResponse] = await Promise.all([
        analyticsService.platformAdmin.getCompanyOverview(),
        analyticsService.platformAdmin.getSecurityReport(),
        analyticsService.platformAdmin.getSystemHealth(),
      ]);

      if (companyResponse.success) {
        setCompanyOverview(companyResponse.data);
      }

      if (securityResponse.success) {
        setSecurityReport(securityResponse.data);
      }

      if (healthResponse.success) {
        setSystemHealth(healthResponse.data);
      }

      if (!companyResponse.success && !securityResponse.success && !healthResponse.success) {
        setError('Failed to fetch platform admin analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform admin analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformAdminAnalytics();
  }, [fetchPlatformAdminAnalytics]);

  return {
    companyOverview,
    securityReport,
    systemHealth,
    loading,
    error,
    refetch: fetchPlatformAdminAnalytics,
  };
}

// ============================================================================
// DASHBOARD OVERVIEW HOOK
// ============================================================================

export function useDashboardOverview() {
  const [overview, setOverview] = useState<DashboardOverview>({
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.dashboard.getOverview();

      if (response.success) {
        setOverview(response.data);
      } else {
        setError(response.error || 'Failed to fetch dashboard overview');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  return {
    overview,
    loading,
    error,
    refetch: fetchDashboardOverview,
  };
}

// ============================================================================
// COMPREHENSIVE ANALYTICS HOOK
// ============================================================================

export function useAnalyticsSummary() {
  const [summary, setSummary] = useState<AnalyticsSummary>({
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getAnalyticsSummary();

      if (response.success) {
        setSummary(response.data);
      } else {
        setError(response.error || 'Failed to fetch analytics summary');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsSummary();
  }, [fetchAnalyticsSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchAnalyticsSummary,
  };
}