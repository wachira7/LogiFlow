// src/services/demoService.ts
import { api } from './api'
import type { User } from '@/types/auth.types'

type Session = { user: User; tokens: { access: string; refresh: string }; message: string }

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'The demo couldn’t start. Please try again.')
  return res.data as T
}

export const demoService = {
  /** A private, pre-filled demo company for this visitor (deleted after a day). */
  start: async () => unwrap(await api.post<Session>('/api/v1/demo/start/')),
  /** Inside a demo: become the driver, or go back to being the owner. */
  switchRole: async (role: 'owner' | 'driver') => unwrap(await api.post<Session>('/api/v1/demo/switch/', { role })),
}
