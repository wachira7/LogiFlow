// src/services/billingService.ts

import { api } from './api';
import type {
  BillingApiResponse,
  SubscriptionPlan,
  SubscriptionPlanFilters,
  UserSubscription,
  UserSubscriptionDetail,
  CreateSubscriptionData,
  SubscriptionFilters,
  SubscriptionDashboard,
  PaymentTransaction,
  TransactionFilters,
  RevenueReport,
  PaymentMethod,
  PaymentMethodFilters,
  StripePaymentData,
  StripePaymentResponse,
  MPesaPaymentData,
  MPesaPaymentResponse,
  MPesaStatusData,
  MPesaStatusResponse,
  CryptoPaymentData,
  CryptoPaymentResponse,
  CryptoStatusData,
  CryptoStatusResponse,
} from '@/types/billing.types';

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

/**
 * Get all available subscription plans
 */
async function getPlans(filters?: SubscriptionPlanFilters): Promise<BillingApiResponse<SubscriptionPlan[]>> {
  try {
    console.log('API call: GET /api/v1/payments/plans/', { filters });
    const response = await api.get<{ count: number; results: SubscriptionPlan[] }>('/api/v1/payments/plans/', { params: filters });
    
    console.log('Plans API response:', response);
    
    if (!response.success) {
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch subscription plans'
      };
    }
    
    const plans = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    
    return {
      success: true,
      data: plans,
      pagination: response.data?.count ? {
        count: response.data.count,
        next: null,
        previous: null
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch subscription plans'
    };
  }
}

/**
 * Get plan by ID
 */
async function getPlanById(id: string): Promise<BillingApiResponse<SubscriptionPlan>> {
  try {
    console.log('API call: GET /api/v1/payments/plans/' + id);
    const response = await api.get<SubscriptionPlan>(`/api/v1/payments/plans/${id}/`);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as SubscriptionPlan,
        error: response.error || 'Plan not found'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching plan:', error);
    return {
      success: false,
      data: {} as SubscriptionPlan,
      error: error instanceof Error ? error.message : 'Failed to fetch plan'
    };
  }
}

// ============================================================================
// USER SUBSCRIPTIONS
// ============================================================================

/**
 * Get all subscriptions for the current company
 */
async function getSubscriptions(filters?: SubscriptionFilters): Promise<BillingApiResponse<UserSubscription[]>> {
  try {
    console.log('API call: GET /api/v1/payments/subscriptions/', { filters });
    const response = await api.get<{ count: number; results: UserSubscription[] }>('/api/v1/payments/subscriptions/', { params: filters });
    
    console.log('Subscriptions API response:', response);
    
    if (!response.success) {
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch subscriptions'
      };
    }
    
    const subscriptions = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    
    return {
      success: true,
      data: subscriptions,
      pagination: response.data?.count ? {
        count: response.data.count,
        next: null,
        previous: null
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch subscriptions'
    };
  }
}

/**
 * Get subscription by ID
 */
async function getSubscriptionById(id: string): Promise<BillingApiResponse<UserSubscriptionDetail>> {
  try {
    console.log('API call: GET /api/v1/payments/subscriptions/' + id);
    const response = await api.get<UserSubscriptionDetail>(`/api/v1/payments/subscriptions/${id}/`);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as UserSubscriptionDetail,
        error: response.error || 'Subscription not found'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return {
      success: false,
      data: {} as UserSubscriptionDetail,
      error: error instanceof Error ? error.message : 'Failed to fetch subscription'
    };
  }
}

/**
 * Create new subscription
 */
async function createSubscription(data: CreateSubscriptionData): Promise<BillingApiResponse<UserSubscriptionDetail>> {
  try {
    console.log('API call: POST /api/v1/payments/subscriptions/', data);
    const response = await api.post<UserSubscriptionDetail>('/api/v1/payments/subscriptions/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as UserSubscriptionDetail,
        error: response.error || 'Failed to create subscription'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      data: {} as UserSubscriptionDetail,
      error: error instanceof Error ? error.message : 'Failed to create subscription'
    };
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(id: string): Promise<BillingApiResponse<{ message: string; status: string; refund_amount: number }>> {
  try {
    console.log('API call: POST /api/v1/payments/subscriptions/' + id + '/cancel_subscription/');
    const response = await api.post<{ message: string; status: string; refund_amount: number }>(
      `/api/v1/payments/subscriptions/${id}/cancel_subscription/`,
      {}
    );
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: { message: '', status: '', refund_amount: 0 },
        error: response.error || 'Failed to cancel subscription'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      data: { message: '', status: '', refund_amount: 0 },
      error: error instanceof Error ? error.message : 'Failed to cancel subscription'
    };
  }
}

/**
 * Reactivate subscription
 */
async function reactivateSubscription(id: string): Promise<BillingApiResponse<{ message: string; status: string }>> {
  try {
    console.log('API call: POST /api/v1/payments/subscriptions/' + id + '/reactivate_subscription/');
    const response = await api.post<{ message: string; status: string }>(
      `/api/v1/payments/subscriptions/${id}/reactivate_subscription/`,
      {}
    );
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: { message: '', status: '' },
        error: response.error || 'Failed to reactivate subscription'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return {
      success: false,
      data: { message: '', status: '' },
      error: error instanceof Error ? error.message : 'Failed to reactivate subscription'
    };
  }
}

/**
 * Get subscription dashboard data
 */
async function getSubscriptionDashboard(): Promise<BillingApiResponse<SubscriptionDashboard>> {
  try {
    console.log('API call: GET /api/v1/payments/subscriptions/dashboard/');
    const response = await api.get<SubscriptionDashboard>('/api/v1/payments/subscriptions/dashboard/');
    
    if (!response.success || !response.data) {
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
          next_billing_date: null
        },
        error: response.error || 'Failed to fetch dashboard data'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching subscription dashboard:', error);
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
        next_billing_date: null
      },
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    };
  }
}

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

/**
 * Get all transactions for the current company
 */
async function getTransactions(filters?: TransactionFilters): Promise<BillingApiResponse<PaymentTransaction[]>> {
  try {
    console.log('API call: GET /api/v1/payments/transactions/', { filters });
    const response = await api.get<{ count: number; results: PaymentTransaction[] }>('/api/v1/payments/transactions/', { params: filters });
    
    console.log('Transactions API response:', response);
    
    if (!response.success) {
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch transactions'
      };
    }
    
    const transactions = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    
    return {
      success: true,
      data: transactions,
      pagination: response.data?.count ? {
        count: response.data.count,
        next: null,
        previous: null
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch transactions'
    };
  }
}

/**
 * Get transaction by ID
 */
async function getTransactionById(id: string): Promise<BillingApiResponse<PaymentTransaction>> {
  try {
    console.log('API call: GET /api/v1/payments/transactions/' + id);
    const response = await api.get<PaymentTransaction>(`/api/v1/payments/transactions/${id}/`);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as PaymentTransaction,
        error: response.error || 'Transaction not found'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      success: false,
      data: {} as PaymentTransaction,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction'
    };
  }
}

/**
 * Get revenue report
 */
async function getRevenueReport(): Promise<BillingApiResponse<RevenueReport>> {
  try {
    console.log('API call: GET /api/v1/payments/transactions/revenue_report/');
    const response = await api.get<RevenueReport>('/api/v1/payments/transactions/revenue_report/');
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {
          total_revenue: 0,
          provider_revenue: { stripe: 0, mpesa: 0, crypto: 0 },
          monthly_revenue: [],
          transaction_count: 0
        },
        error: response.error || 'Failed to fetch revenue report'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    return {
      success: false,
      data: {
        total_revenue: 0,
        provider_revenue: { stripe: 0, mpesa: 0, crypto: 0 },
        monthly_revenue: [],
        transaction_count: 0
      },
      error: error instanceof Error ? error.message : 'Failed to fetch revenue report'
    };
  }
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Get all payment methods for the current company
 */
async function getPaymentMethods(filters?: PaymentMethodFilters): Promise<BillingApiResponse<PaymentMethod[]>> {
  try {
    console.log('API call: GET /api/v1/payments/payment-methods/', { filters });
    const response = await api.get<{ count: number; results: PaymentMethod[] }>('/api/v1/payments/payment-methods/', { params: filters });
    
    console.log('Payment methods API response:', response);
    
    if (!response.success) {
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch payment methods'
      };
    }
    
    const methods = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    
    return {
      success: true,
      data: methods,
      pagination: response.data?.count ? {
        count: response.data.count,
        next: null,
        previous: null
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch payment methods'
    };
  }
}

/**
 * Set payment method as default
 */
async function setDefaultPaymentMethod(id: string): Promise<BillingApiResponse<{ message: string; is_default: boolean }>> {
  try {
    console.log('API call: POST /api/v1/payments/payment-methods/' + id + '/set_default/');
    const response = await api.post<{ message: string; is_default: boolean }>(
      `/api/v1/payments/payment-methods/${id}/set_default/`,
      {}
    );
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: { message: '', is_default: false },
        error: response.error || 'Failed to set default payment method'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return {
      success: false,
      data: { message: '', is_default: false },
      error: error instanceof Error ? error.message : 'Failed to set default payment method'
    };
  }
}

/**
 * Delete payment method
 */
async function deletePaymentMethod(id: string): Promise<BillingApiResponse<void>> {
  try {
    console.log('API call: DELETE /api/v1/payments/payment-methods/' + id);
    const response = await api.delete(`/api/v1/payments/payment-methods/${id}/`);
    
    if (!response.success) {
      return {
        success: false,
        data: undefined,
        error: response.error || 'Failed to delete payment method'
      };
    }
    
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Failed to delete payment method'
    };
  }
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

/**
 * Initiate Stripe payment
 */
async function initiateStripePayment(data: StripePaymentData): Promise<BillingApiResponse<StripePaymentResponse>> {
  try {
    console.log('API call: POST /api/v1/payments/stripe/pay/', data);
    const response = await api.post<StripePaymentResponse>('/api/v1/payments/stripe/pay/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as StripePaymentResponse,
        error: response.error || 'Failed to initiate Stripe payment'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error initiating Stripe payment:', error);
    return {
      success: false,
      data: {} as StripePaymentResponse,
      error: error instanceof Error ? error.message : 'Failed to initiate Stripe payment'
    };
  }
}

/**
 * Initiate M-Pesa payment
 */
async function initiateMPesaPayment(data: MPesaPaymentData): Promise<BillingApiResponse<MPesaPaymentResponse>> {
  try {
    console.log('API call: POST /api/v1/payments/mpesa/pay/', data);
    const response = await api.post<MPesaPaymentResponse>('/api/v1/payments/mpesa/pay/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as MPesaPaymentResponse,
        error: response.error || 'Failed to initiate M-Pesa payment'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);
    return {
      success: false,
      data: {} as MPesaPaymentResponse,
      error: error instanceof Error ? error.message : 'Failed to initiate M-Pesa payment'
    };
  }
}

/**
 * Check M-Pesa payment status
 */
async function checkMPesaStatus(data: MPesaStatusData): Promise<BillingApiResponse<MPesaStatusResponse>> {
  try {
    console.log('API call: POST /api/v1/payments/mpesa/status/', data);
    const response = await api.post<MPesaStatusResponse>('/api/v1/payments/mpesa/status/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as MPesaStatusResponse,
        error: response.error || 'Failed to check M-Pesa status'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error checking M-Pesa status:', error);
    return {
      success: false,
      data: {} as MPesaStatusResponse,
      error: error instanceof Error ? error.message : 'Failed to check M-Pesa status'
    };
  }
}

/**
 * Create crypto payment
 */
async function createCryptoPayment(data: CryptoPaymentData): Promise<BillingApiResponse<CryptoPaymentResponse>> {
  try {
    console.log('API call: POST /api/v1/payments/crypto/pay/', data);
    const response = await api.post<CryptoPaymentResponse>('/api/v1/payments/crypto/pay/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as CryptoPaymentResponse,
        error: response.error || 'Failed to create crypto payment'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error creating crypto payment:', error);
    return {
      success: false,
      data: {} as CryptoPaymentResponse,
      error: error instanceof Error ? error.message : 'Failed to create crypto payment'
    };
  }
}

/**
 * Check crypto payment status
 */
async function checkCryptoStatus(data: CryptoStatusData): Promise<BillingApiResponse<CryptoStatusResponse>> {
  try {
    console.log('API call: POST /api/v1/payments/crypto/status/', data);
    const response = await api.post<CryptoStatusResponse>('/api/v1/payments/crypto/status/', data);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        data: {} as CryptoStatusResponse,
        error: response.error || 'Failed to check crypto status'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error checking crypto status:', error);
    return {
      success: false,
      data: {} as CryptoStatusResponse,
      error: error instanceof Error ? error.message : 'Failed to check crypto status'
    };
  }
}

// ============================================================================
// TESTING ENDPOINTS
// ============================================================================

/**
 * Test Stripe connection
 */
async function testStripeConnection(): Promise<BillingApiResponse<unknown>> {
  try {
    const response = await api.get('/api/v1/payments/test-stripe/');
    return {
      success: response.success,
      data: response.data || {}
    };
  } catch (error) {
    return {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : 'Failed to test Stripe connection'
    };
  }
}

/**
 * Test M-Pesa connection
 */
async function testMPesaConnection(): Promise<BillingApiResponse<unknown>> {
  try {
    const response = await api.get('/api/v1/payments/test-mpesa/');
    return {
      success: response.success,
      data: response.data || {}
    };
  } catch (error) {
    return {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : 'Failed to test M-Pesa connection'
    };
  }
}

/**
 * Test Crypto connection
 */
async function testCryptoConnection(): Promise<BillingApiResponse<unknown>> {
  try {
    const response = await api.get('/api/v1/payments/test-crypto/');
    return {
      success: response.success,
      data: response.data || {}
    };
  } catch (error) {
    return {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : 'Failed to test Crypto connection'
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const billingService = {
  // Plans
  getPlans,
  getPlanById,
  
  // Subscriptions
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionDashboard,
  
  // Transactions
  getTransactions,
  getTransactionById,
  getRevenueReport,
  
  // Payment Methods
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  
  // Payment Processing
  initiateStripePayment,
  initiateMPesaPayment,
  checkMPesaStatus,
  createCryptoPayment,
  checkCryptoStatus,
  
  // Testing
  testStripeConnection,
  testMPesaConnection,
  testCryptoConnection,
};