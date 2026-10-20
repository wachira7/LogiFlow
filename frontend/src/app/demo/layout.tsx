// src/app/demo/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Try the live demo',
  description: 'Explore LogiFlow with a private demo company full of sample data. No sign-up needed.',
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
