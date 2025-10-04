//src/utils/dateUtils.ts

export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '-'
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Date formatting error:', error)
    return '-'
  }
}

export const formatRelativeDate = (dateString: string | undefined | null) => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '-'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    } else {
      // For older dates, show formatted date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  } catch (error) {
    console.error('Date formatting error:', error)
    return '-'
  }
}

// Currency formatting function
export const formatCurrency = (
  amount: number | string | null | undefined, 
  currency: string = 'USD',
  locale: string = 'en-US'
) => {
  if (amount === null || amount === undefined || amount === '') return '$0.00'
  
  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    // Check if the number is valid
    if (isNaN(numericAmount)) return '$0.00'
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount)
  } catch (error) {
    console.error('Currency formatting error:', error)
    return `$${amount}`
  }
}

// Number formatting for quantities, percentages, etc.
export const formatNumber = (
  num: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
) => {
  if (num === null || num === undefined || num === '') return '0'
  
  try {
    const numericValue = typeof num === 'string' ? parseFloat(num) : num
    
    if (isNaN(numericValue)) return '0'
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(numericValue)
  } catch (error) {
    console.error('Number formatting error:', error)
    return String(num)
  }
}

// Percentage formatting
export const formatPercentage = (
  value: number | string | null | undefined,
  decimals: number = 1
) => {
  if (value === null || value === undefined || value === '') return '0%'
  
  try {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value
    
    if (isNaN(numericValue)) return '0%'
    
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue / 100)
  } catch (error) {
    console.error('Percentage formatting error:', error)
    return `${value}%`
  }
}

// Format date range
export const formatDateRange = (
  startDate: string | undefined | null,
  endDate: string | undefined | null,
  options: Intl.DateTimeFormatOptions = {}
) => {
  if (!startDate || !endDate) return '-'
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-'
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    }
    
    const startFormatted = start.toLocaleDateString('en-US', defaultOptions)
    const endFormatted = end.toLocaleDateString('en-US', defaultOptions)
    
    return `${startFormatted} - ${endFormatted}`
  } catch (error) {
    console.error('Date range formatting error:', error)
    return '-'
  }
}