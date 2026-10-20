// src/services/billingService.ts
import { api } from './api'
import type {
  BillingOverview, CryptoPayResponse, MpesaPayResponse, PaymentMethod, Provider, Subscription, SubscriptionDetail,
  SubscriptionPlan, Transaction,
} from '@/types/billing.types'

const BASE = '/api/v1/payments'

/** Payload, or throw the server's message so the UI can show it. */
function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}

const list = <T>(data: unknown): T[] => (Array.isArray(data) ? data : ((data as { results?: T[] })?.results ?? []))

export const billingService = {
  overview: async () => unwrap(await api.get<BillingOverview>(`${BASE}/subscriptions/overview/`)),

  plans: async () => list<SubscriptionPlan>(unwrap(await api.get(`${BASE}/plans/`, { page_size: 100 }))),

  subscriptions: async () => list<Subscription>(unwrap(await api.get(`${BASE}/subscriptions/`, { page_size: 100 }))),
  subscription: async (id: string) => unwrap(await api.get<SubscriptionDetail>(`${BASE}/subscriptions/${id}/`)),
  /** M-Pesa / crypto: free trial (if available) or pay now */
  subscribe: async (planId: string, provider: Exclude<Provider, 'STRIPE'>, payNow = false) =>
    unwrap(await api.post<SubscriptionDetail>(`${BASE}/subscriptions/`, { plan_id: planId, payment_provider: provider, pay_now: payNow })),
  cancel: async (id: string) =>
    unwrap(await api.post<{ message: string; subscription: SubscriptionDetail }>(`${BASE}/subscriptions/${id}/cancel_subscription/`)),
  resume: async (id: string) =>
    unwrap(await api.post<{ message: string; subscription: SubscriptionDetail }>(`${BASE}/subscriptions/${id}/reactivate_subscription/`)),

  transactions: async (filters: { status?: string; provider?: string; search?: string } = {}) =>
    list<Transaction>(unwrap(await api.get(`${BASE}/transactions/`, { ...filters, page_size: 100 }))),

  paymentMethods: async () => list<PaymentMethod>(unwrap(await api.get(`${BASE}/payment-methods/`, { page_size: 100 }))),
  addPaymentMethod: async (data: { type: 'MPESA'; phone_number: string } | { type: 'CRYPTO'; currency: string; wallet_address?: string }) =>
    unwrap(await api.post<PaymentMethod>(`${BASE}/payment-methods/`, data)),
  setDefault: async (id: string) => unwrap(await api.post(`${BASE}/payment-methods/${id}/set_default/`)),
  removePaymentMethod: async (id: string) => unwrap(await api.delete(`${BASE}/payment-methods/${id}/`)),

  stripeCheckout: async (planId: string) =>
    unwrap(await api.post<{ checkout_url: string; session_id: string; trial: boolean }>(`${BASE}/stripe/checkout/`, { plan_id: planId })),
  stripeCheckoutComplete: async (sessionId: string) =>
    unwrap(await api.post<{ message: string; subscription: SubscriptionDetail }>(`${BASE}/stripe/checkout/success/`, { session_id: sessionId })),
  stripeCardSetup: async () => unwrap(await api.post<{ checkout_url: string }>(`${BASE}/stripe/setup/`)),
  stripeCardSetupComplete: async (sessionId: string) =>
    unwrap(await api.post<{ message: string; payment_method: PaymentMethod }>(`${BASE}/stripe/setup/complete/`, { session_id: sessionId })),

  payMpesa: async (subscriptionId: string, phone?: string) =>
    unwrap(await api.post<MpesaPayResponse>(`${BASE}/mpesa/pay/`, { subscription_id: subscriptionId, ...(phone ? { phone_number: phone } : {}) })),
  mpesaStatus: async (checkoutId: string) =>
    unwrap(await api.post<{ status: string }>(`${BASE}/mpesa/status/`, { checkout_request_id: checkoutId })),
  payCrypto: async (subscriptionId: string, payCurrency?: string) =>
    unwrap(await api.post<CryptoPayResponse>(`${BASE}/crypto/pay/`, { subscription_id: subscriptionId, ...(payCurrency ? { pay_currency: payCurrency } : {}) })),
  cryptoStatus: async (paymentId: string) =>
    unwrap(await api.post<{ status: string }>(`${BASE}/crypto/status/`, { payment_id: paymentId })),
}
