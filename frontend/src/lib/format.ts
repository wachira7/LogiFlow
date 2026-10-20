// src/lib/format.ts
// Display formatting shared by the app pages. DRF sends decimals as strings, so inputs are coerced.

type Numeric = number | string | null | undefined

const toNumber = (value: Numeric) => {
  const n = typeof value === 'string' ? Number(value) : value ?? 0
  return Number.isFinite(n) ? (n as number) : 0
}

// The signed-in company's currency; the app shell sets it from the user's profile before pages render
let companyCurrency = 'USD'

export function setCompanyCurrency(code?: string | null) {
  if (code && /^[A-Z]{3}$/.test(code)) companyCurrency = code
}

export function getCompanyCurrency() {
  return companyCurrency
}

/** Money in the company currency unless another is given. */
export function formatMoney(value: Numeric, currency: string = companyCurrency, options: Intl.NumberFormatOptions = {}) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2, ...options }).format(toNumber(value))
  } catch {
    return `${currency} ${toNumber(value).toLocaleString()}`
  }
}

export function formatCount(value: Numeric) {
  return toNumber(value).toLocaleString()
}

export function formatDay(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "3 hours ago", "2 days ago". */
export function timeAgo(value?: string | null) {
  if (!value) return '—'
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit)
  }
  return 'just now'
}

export { toNumber }
