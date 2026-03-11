// src/hooks/useBilling.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { billingService } from '@/services/billingService';
import type {
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
  MPesaPaymentData,
  MPesaPaymentResponse,
  MPesaStatusData,
  CryptoPaymentData,
  CryptoPaymentResponse,
  CryptoStatusData,
} from '@/types/billing.types';

// ============================================================================
// SUBSCRIPTION PLANS HOOK - WITH CACHING
// ============================================================================


export function useSubscriptionPlans(filters?: SubscriptionPlanFilters) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersString = JSON.stringify(filters || {});

  useEffect(() => {
    let cancelled = false;

      const fetchPlans = async () => {
        setLoading(true);
        setError(null);

        const response = await billingService.getPlans(filters);

        if (cancelled) return;

        if (response.success) {
          setPlans(response.data || []);
        } else {
          setError(response.error || 'Failed to fetch subscription plans');
          setPlans([]);
        }

        setLoading(false);
      };

      fetchPlans();

      return () => {
        cancelled = true;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersString]); // ✅ Re-fetches whenever billing_cycle or is_active changes

    const getPlanById = useCallback(async (id: string) => {
      const response = await billingService.getPlanById(id);
      return response.success ? response.data : null;
    }, []);

    const refetch = useCallback(async () => {
      setLoading(true);
      const response = await billingService.getPlans(filters);
      if (response.success) {
        setPlans(response.data || []);
      }
      setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersString]);

  return {
    plans,
    loading,
    error,
    refetch,
    getPlanById,
  };
}

// USER SUBSCRIPTIONS HOOK 
export function useSubscriptions(filters?: SubscriptionFilters) {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  
  //  Serialize filters to prevent unnecessary re-renders
  const filtersString = JSON.stringify(filters || {});

  useEffect(() => {
    //  Only fetch once per filter change
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchSubscriptions = async () => {
      setLoading(true);
      setError(null);
      
      const response = await billingService.getSubscriptions(filters);
      
      if (response.success) {
        setSubscriptions(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch subscriptions');
        setSubscriptions([]);
      }
      
      setLoading(false);
    };

    fetchSubscriptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersString]); //Use serialized string instead of object

  const getSubscriptionById = useCallback(async (id: string): Promise<UserSubscriptionDetail | null> => {
    const response = await billingService.getSubscriptionById(id);
    return response.success ? response.data : null;
  }, []);

  const createSubscription = useCallback(async (data: CreateSubscriptionData) => {
    const response = await billingService.createSubscription(data);
    
    if (response.success) {
      // Refetch subscriptions after creation
      fetchedRef.current = false;
      const refreshResponse = await billingService.getSubscriptions(filters);
      if (refreshResponse.success) {
        setSubscriptions(refreshResponse.data || []);
      }
      return { success: true, data: response.data };
    }
    
    return { success: false, error: response.error };
  }, [filters]);

  const cancelSubscription = useCallback(async (id: string) => {
    const response = await billingService.cancelSubscription(id);
    
    if (response.success) {
      fetchedRef.current = false;
      const refreshResponse = await billingService.getSubscriptions(filters);
      if (refreshResponse.success) {
        setSubscriptions(refreshResponse.data || []);
      }
      return { success: true, data: response.data };
    }
    
    return { success: false, error: response.error };
  }, [filters]);

  const reactivateSubscription = useCallback(async (id: string) => {
    const response = await billingService.reactivateSubscription(id);
    
    if (response.success) {
      fetchedRef.current = false;
      const refreshResponse = await billingService.getSubscriptions(filters);
      if (refreshResponse.success) {
        setSubscriptions(refreshResponse.data || []);
      }
      return { success: true, data: response.data };
    }
    
    return { success: false, error: response.error };
  }, [filters]);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setLoading(true);
    const response = await billingService.getSubscriptions(filters);
    
    if (response.success) {
      setSubscriptions(response.data || []);
    }
    setLoading(false);
  }, [filters]);

  return {
    subscriptions,
    loading,
    error,
    refetch,
    getSubscriptionById,
    createSubscription,
    cancelSubscription,
    reactivateSubscription,
  };
}

// ============================================================================
// SUBSCRIPTION DASHBOARD HOOK - FIXED
// ============================================================================

export function useSubscriptionDashboard() {
  const [dashboard, setDashboard] = useState<SubscriptionDashboard>({
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
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      
      const response = await billingService.getSubscriptionDashboard();
      
      if (response.success) {
        setDashboard(response.data);
      } else {
        setError(response.error || 'Failed to fetch dashboard data');
      }
      
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setLoading(true);
    const response = await billingService.getSubscriptionDashboard();
    
    if (response.success) {
      setDashboard(response.data);
    }
    setLoading(false);
  }, []);

  return {
    dashboard,
    loading,
    error,
    refetch,
  };
}

// ============================================================================
// PAYMENT TRANSACTIONS HOOK - FIXED
// ============================================================================

export function useTransactions(filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const filtersString = JSON.stringify(filters || {});

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      
      const response = await billingService.getTransactions(filters);
      
      if (response.success) {
        setTransactions(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch transactions');
        setTransactions([]);
      }
      
      setLoading(false);
    };

    fetchTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersString]);

  const getTransactionById = useCallback(async (id: string) => {
    const response = await billingService.getTransactionById(id);
    return response.success ? response.data : null;
  }, []);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setLoading(true);
    const response = await billingService.getTransactions(filters);
    
    if (response.success) {
      setTransactions(response.data || []);
    }
    setLoading(false);
  }, [filters]);

  return {
    transactions,
    loading,
    error,
    refetch,
    getTransactionById,
  };
}

// ============================================================================
// REVENUE REPORT HOOK - FIXED
// ============================================================================

export function useRevenueReport() {
  const [report, setReport] = useState<RevenueReport>({
    total_revenue: 0,
    provider_revenue: { stripe: 0, mpesa: 0, crypto: 0 },
    monthly_revenue: [],
    transaction_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      
      const response = await billingService.getRevenueReport();
      
      if (response.success) {
        setReport(response.data);
      } else {
        setError(response.error || 'Failed to fetch revenue report');
      }
      
      setLoading(false);
    };

    fetchReport();
  }, []);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setLoading(true);
    const response = await billingService.getRevenueReport();
    
    if (response.success) {
      setReport(response.data);
    }
    setLoading(false);
  }, []);

  return {
    report,
    loading,
    error,
    refetch,
  };
}

// ============================================================================
// PAYMENT METHODS HOOK - FIXED
// ============================================================================

export function usePaymentMethods(filters?: PaymentMethodFilters) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const filtersString = JSON.stringify(filters || {});

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchPaymentMethods = async () => {
      setLoading(true);
      setError(null);
      
      const response = await billingService.getPaymentMethods(filters);
      
      if (response.success) {
        setPaymentMethods(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch payment methods');
        setPaymentMethods([]);
      }
      
      setLoading(false);
    };

    fetchPaymentMethods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersString]);

  const setDefaultMethod = useCallback(async (id: string) => {
    const response = await billingService.setDefaultPaymentMethod(id);
    
    if (response.success) {
      fetchedRef.current = false;
      const refreshResponse = await billingService.getPaymentMethods(filters);
      if (refreshResponse.success) {
        setPaymentMethods(refreshResponse.data || []);
      }
      return { success: true, data: response.data };
    }
    
    return { success: false, error: response.error };
  }, [filters]);

  const deleteMethod = useCallback(async (id: string) => {
    const response = await billingService.deletePaymentMethod(id);
    
    if (response.success) {
      fetchedRef.current = false;
      const refreshResponse = await billingService.getPaymentMethods(filters);
      if (refreshResponse.success) {
        setPaymentMethods(refreshResponse.data || []);
      }
      return { success: true };
    }
    
    return { success: false, error: response.error };
  }, [filters]);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setLoading(true);
    const response = await billingService.getPaymentMethods(filters);
    
    if (response.success) {
      setPaymentMethods(response.data || []);
    }
    setLoading(false);
  }, [filters]);

  return {
    paymentMethods,
    loading,
    error,
    refetch,
    setDefaultMethod,
    deleteMethod,
  };
}

// ============================================================================
// STRIPE PAYMENT HOOK
// ============================================================================

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);

    const response = await billingService.createStripeCheckoutSession({
      plan_id: planId,
      success_url: `${window.location.origin}/billing/subscriptions?checkout=success`,
      cancel_url: `${window.location.origin}/billing/plans?checkout=cancelled`,
    });

    if (response.success && response.data.checkout_url) {
      // Redirect to Stripe hosted checkout page
      window.location.href = response.data.checkout_url;
      return { success: true };
    }

    const errorMsg = response.error || 'Failed to create checkout session';
    setError(errorMsg);
    setLoading(false);
    return { success: false, error: errorMsg };
  }, []);

  const handleCheckoutSuccess = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);

    const response = await billingService.handleStripeCheckoutSuccess({
      session_id: sessionId,
    });

    setLoading(false);

    if (response.success) {
      return { success: true, data: response.data };
    }

    const errorMsg = response.error || 'Failed to process payment';
    setError(errorMsg);
    return { success: false, error: errorMsg };
  }, []);

  return {
    loading,
    error,
    initiateCheckout,
    handleCheckoutSuccess,
  };
}

// ============================================================================
// M-PESA PAYMENT HOOK
// ============================================================================

export function useMPesaPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<MPesaPaymentResponse | null>(null);

  const initiatePayment = useCallback(async (data: MPesaPaymentData) => {
    setLoading(true);
    setError(null);
    setPaymentResponse(null);
    
    const response = await billingService.initiateMPesaPayment(data);
    
    if (response.success) {
      setPaymentResponse(response.data);
      setLoading(false);
      return { success: true, data: response.data };
    }
    
    setError(response.error || 'Failed to initiate M-Pesa payment');
    setLoading(false);
    return { success: false, error: response.error };
  }, []);

  const checkStatus = useCallback(async (data: MPesaStatusData) => {
    const response = await billingService.checkMPesaStatus(data);
    return response.success ? { success: true, data: response.data } : { success: false, error: response.error };
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setPaymentResponse(null);
  }, []);

  return {
    loading,
    error,
    paymentResponse,
    initiatePayment,
    checkStatus,
    reset,
  };
}

// ============================================================================
// CRYPTO PAYMENT HOOK
// ============================================================================

export function useCryptoPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<CryptoPaymentResponse | null>(null);

  const createPayment = useCallback(async (data: CryptoPaymentData) => {
    setLoading(true);
    setError(null);
    setPaymentResponse(null);
    
    const response = await billingService.createCryptoPayment(data);
    
    if (response.success) {
      setPaymentResponse(response.data);
      setLoading(false);
      return { success: true, data: response.data };
    }
    
    setError(response.error || 'Failed to create crypto payment');
    setLoading(false);
    return { success: false, error: response.error };
  }, []);

  const checkStatus = useCallback(async (data: CryptoStatusData) => {
    const response = await billingService.checkCryptoStatus(data);
    return response.success ? { success: true, data: response.data } : { success: false, error: response.error };
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setPaymentResponse(null);
  }, []);

  return {
    loading,
    error,
    paymentResponse,
    createPayment,
    checkStatus,
    reset,
  };
}

// ============================================================================
// PAYMENT PROVIDER TESTING HOOK
// ============================================================================

export function usePaymentProviderTests() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    stripe?: { success: boolean; message: string };
    mpesa?: { success: boolean; message: string };
    crypto?: { success: boolean; message: string };
  }>({});

  const testStripe = useCallback(async () => {
    setTesting(true);
    const response = await billingService.testStripeConnection();
    
    setResults(prev => ({
      ...prev,
      stripe: {
        success: response.success,
        message: response.success ? 'Stripe connection successful' : response.error || 'Failed to connect'
      }
    }));
    
    setTesting(false);
    return response;
  }, []);

  const testMPesa = useCallback(async () => {
    setTesting(true);
    const response = await billingService.testMPesaConnection();
    
    setResults(prev => ({
      ...prev,
      mpesa: {
        success: response.success,
        message: response.success ? 'M-Pesa connection successful' : response.error || 'Failed to connect'
      }
    }));
    
    setTesting(false);
    return response;
  }, []);

  const testCrypto = useCallback(async () => {
    setTesting(true);
    const response = await billingService.testCryptoConnection();
    
    setResults(prev => ({
      ...prev,
      crypto: {
        success: response.success,
        message: response.success ? 'Crypto connection successful' : response.error || 'Failed to connect'
      }
    }));
    
    setTesting(false);
    return response;
  }, []);

  const testAll = useCallback(async () => {
    await testStripe();
    await testMPesa();
    await testCrypto();
  }, [testStripe, testMPesa, testCrypto]);

  return {
    testing,
    results,
    testStripe,
    testMPesa,
    testCrypto,
    testAll,
  };
}