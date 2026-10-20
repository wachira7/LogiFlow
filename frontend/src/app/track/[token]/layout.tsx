// src/app/track/[token]/layout.tsx
import type { Metadata } from 'next'

// Tracking links are private to whoever was sent them: keep them out of search engines
export const metadata: Metadata = {
  title: 'Track your delivery',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
