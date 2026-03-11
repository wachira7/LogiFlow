// src/types/billing.types.ts
// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING' | 'UNPAID' | 'EXPIRED';
export type PaymentProvider = 'STRIPE' | 'MPESA' | 'CRYPTO';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'SUBSCRIPTION' | 'ONE_TIME';
export type PaymentMethodType = 'CARD' | 'MPESA' | 'CRYPTO';

// ============================================================================
// SUBSCRIPTION PLAN
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  billing_cycle: BillingCycle;
  features: Record<string, unknown>;
  is_active: boolean;
  max_users: number;
  max_warehouses: number;
  max_products: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanFilters {
  billing_cycle?: BillingCycle;
  is_active?: boolean;
  search?: string;
  ordering?: string;
}

// ============================================================================
// USER SUBSCRIPTION
// ============================================================================

export interface UserSubscription {
  id: string;
  company_name: string;
  plan_name: string;
  plan_price: string;
  plan_id: string;
  status: SubscriptionStatus;
  payment_provider: PaymentProvider;
  start_date: string;
  end_date: string;
  is_trial: boolean;
  days_remaining: number;
  is_expired: boolean;
  auto_renew: boolean;
}

export interface UserSubscriptionDetail extends UserSubscription {
  plan: SubscriptionPlan;
  user_email: string;
  trial_end: string | null;
  recent_transactions: PaymentTransaction[];
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionData {
  plan_id: string;
  payment_provider: PaymentProvider;
  payment_method_id?: string;
  auto_renew: boolean;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  payment_provider?: PaymentProvider;
  is_trial?: boolean;
  search?: string;
  ordering?: string;
}

export interface SubscriptionDashboard {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  total_revenue: number;
  monthly_revenue: number;
  next_billing_date: string | null;
}

// ============================================================================
// PAYMENT TRANSACTION
// ============================================================================

export interface PaymentTransaction {
  id: string;
  company_name: string;
  user_email: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  payment_type: PaymentType;
  provider: PaymentProvider;
  provider_transaction_id: string;
  provider_payment_method: string;
  description: string;
  receipt_url: string;
  invoice_number: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  payment_type?: PaymentType;
  provider?: PaymentProvider;
  currency?: string;
  search?: string;
  ordering?: string;
}

export interface RevenueReport {
  total_revenue: number;
  provider_revenue: {
    stripe: number;
    mpesa: number;
    crypto: number;
  };
  monthly_revenue: Array<{
    month: string;
    revenue: number;
  }>;
  transaction_count: number;
}

// ============================================================================
// PAYMENT METHOD
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  card_brand: string;
  phone_number: string;
  wallet_address: string;
  currency: string;
  is_default: boolean;
  display_info: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodFilters {
  type?: PaymentMethodType;
  provider?: PaymentProvider;
  is_default?: boolean;
  search?: string;
  ordering?: string;
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

// Stripe Payment
export interface StripePaymentData {
  amount: number;
  currency: string;
  payment_method_id?: string;
  description?: string;
}

export interface StripePaymentResponse {
  message: string;
  payment_intent_id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface StripeCheckoutData {
  plan_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface StripeCheckoutSuccessData {
  session_id: string;
}

export interface StripeCheckoutSuccessResponse {
  message: string;
  subscription_id: string;
  plan_name: string;
  status: string;
  is_trial: boolean;
  trial_end: string | null;
  end_date: string;
}

// M-Pesa Payment
export interface MPesaPaymentData {
  phone_number: string;
  amount: number;
  account_reference?: string;
  description?: string;
}

export interface MPesaPaymentResponse {
  message: string;
  checkout_request_id: string;
  merchant_request_id: string;
  customer_message: string;
  response_description: string;
  phone_number: string;
  amount: number;
}

export interface MPesaStatusData {
  checkout_request_id: string;
}

export interface MPesaStatusResponse {
  transaction_status: string;
  checkout_request_id: string;
}

// Crypto Payment
export interface CryptoPaymentData {
  amount: number;
  currency?: string;
  pay_currency?: string;
  order_description?: string;
}

export interface CryptoPaymentResponse {
  message: string;
  payment_id: string;
  payment_url: string;
  payment_address: string;
  pay_currency: string;
  pay_amount: string;
  amount: number;
  currency: string;
  expires_at?: string;
  status: string;
}

export interface CryptoStatusData {
  payment_id: string;
}

export interface CryptoStatusResponse {
  payment_id: string;
  status: string;
  payment_address: string;
  pay_currency: string;
  pay_amount: string;
  price_amount: string;
  price_currency: string;
  created_at: string;
  updated_at: string;
  order_id: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface BillingApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

export interface ExchangeRateResponse {
  from: string;
  to: string;
  rate: number;
  example: {
    input: string;
    output: string;
  };
}