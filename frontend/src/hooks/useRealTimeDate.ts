// src/hooks/useRealTimeDate.ts
import { useState, useEffect } from "react"
import { formatRelativeDate } from '@/utils/dateUtils'

// For real-time updates - use this in components with useEffect
export const useRealTimeDate = (dateString: string | undefined | null, intervalMs = 60000) => {
  const [formattedDate, setFormattedDate] = useState(formatRelativeDate(dateString))
  
  useEffect(() => {
    const updateDate = () => setFormattedDate(formatRelativeDate(dateString))
    
    // Update immediately
    updateDate()
    
    // Set up interval for real-time updates
    const interval = setInterval(updateDate, intervalMs)
    
    return () => clearInterval(interval)
  }, [dateString, intervalMs])
  
  return formattedDate
}