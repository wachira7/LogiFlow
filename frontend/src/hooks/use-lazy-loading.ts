"use client"

import { useEffect, useRef, useState, RefObject } from "react"

interface UseLazyLoadingOptions {
  threshold?: number
  rootMargin?: string
}

interface UseLazyLoadingReturn<T extends HTMLElement> {
  elementRef: RefObject<T>
  isInView: boolean
  hasLoaded: boolean
}

export function useLazyLoading<T extends HTMLElement = HTMLElement>(
  options: UseLazyLoadingOptions = {}
): UseLazyLoadingReturn<T> {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<T>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsInView(true)
          setHasLoaded(true)
          observer.unobserve(element)
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || "50px",
      },
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [hasLoaded, options.threshold, options.rootMargin])

  return { elementRef, isInView, hasLoaded }
}