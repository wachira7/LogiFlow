// hooks/useRecordById.ts
import { useEffect, useState } from 'react'

type Result<T> = { success: boolean; data?: T; error?: string }

/**
 * Fetch one full record by id (detail endpoint). Use this for edit forms and detail pages
 * instead of searching a list, which only holds the first page and lighter list fields.
 */
export function useRecordById<T>(id: string | undefined, fetcher: (id: string) => Promise<Result<T>>) {
  const [record, setRecord] = useState<T | undefined>()
  const [isLoading, setIsLoading] = useState(!!id)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!id) return
    let active = true
    setIsLoading(true)
    fetcher(id).then((res) => {
      if (!active) return
      if (res.success && res.data) setRecord(res.data)
      else setError(res.error || 'Not found')
      setIsLoading(false)
    })
    return () => {
      active = false
    }
    // fetcher is a module-level function; re-fetch only when the id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return { record, isLoading, error }
}
