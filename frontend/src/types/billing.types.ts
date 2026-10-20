// src/types/billing.types.ts
// Shapes of /api/v1/payments/*

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
export type Provider = 'STRIPE' | 'MPESA' | 'CRYPTO'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING' | 'UNPAID' | 'EXPIRED'
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: string
  billing_cycle: BillingCycle
  features: Record<string, unknown> | string[]
  is_active: boolean
  max_users: number
  max_warehouses: number
  max_products: number
}

export interface NextPayment {
  amount: number
  currency: string
  date: string
}

export interface Subscription {
  id: string
  company_name: string
  plan_id: string
  plan_name: string
  plan_price: string
  billing_cycle: BillingCycle
  status: SubscriptionStatus
  payment_provider: Provider
  start_date: string
  end_date: string
  trial_end: string | null
  is_trial: boolean
  days_remaining: number
  is_expired: boolean
  auto_renew: boolean
  /** Set to end when the period is over (cancelled but still usable) */
  cancels_at_period_end: boolean
  next_payment: NextPayment | null
  created_at: string
}

export interface SubscriptionDetail extends Subscription {
  plan: SubscriptionPlan
  user_email: string
  recent_transactions: Transaction[]
  updated_at: string
}

export interface Transaction {
  id: string
  amount: string
  currency: string
  status: TransactionStatus
  payment_type: 'SUBSCRIPTION' | 'ONE_TIME'
  provider: Provider
  provider_transaction_id: string
  provider_payment_method: string
  description: string
  receipt_url: string
  invoice_number: string
  plan_name: string | null
  user_email: string
  created_at: string
}

export interface PaymentMethod {
  id: string
  type: 'CARD' | 'MPESA' | 'CRYPTO'
  provider: Provider
  last_four: string
  expiry_month: string
  expiry_year: string
  card_brand: string
  phone_number: string
  wallet_address: string
  currency: string
  is_default: boolean
  display_info: string
  created_at: string
}

export interface BillingOverview {
  subscription: SubscriptionDetail | null
  trial_available: boolean
  spent_total: Record<string, number>
  spent_this_month: Record<string, number>
  completed_payments: number
  pending_payments: number
  default_payment_method: PaymentMethod | null
  payment_methods: number
  recent_transactions: Transaction[]
  stripe_enabled: boolean
}

export interface MpesaPayResponse {
  message: string
  checkout_request_id: string
  phone_number: string
  amount: number
  currency: 'KES'
}

export interface CryptoPayResponse {
  message: string
  payment_id: string
  payment_url: string | null
  payment_address: string
  pay_currency: string
  pay_amount: string | number
  price_amount: number
  price_currency: string
  expires_at: string | null
  status: string
}
