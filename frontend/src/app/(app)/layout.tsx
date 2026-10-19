// src/app/(app)/layout.tsx
// Every signed-in module shares one app shell, so the sidebar stays put while moving between them.
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
