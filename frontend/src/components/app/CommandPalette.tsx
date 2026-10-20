// src/components/app/CommandPalette.tsx
// Cmd/Ctrl+K: jump to any record or page, or start a common task, from anywhere in the app.
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command as Cmdk } from 'cmdk'
import {
  ArrowDownToLine, ArrowRight, ArrowRightLeft, Building2, ClipboardList, Clock, CornerDownLeft, Factory, Loader2,
  Package, Plus, Route, Search, Siren, SlidersHorizontal, Truck, User, UserPlus, type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { navigation, type NavItem } from '@/components/layout/Sidebar'
import { useAuthUtils } from '@/hooks/useAuth'
import { opsService, type SearchGroup, type SearchItem } from '@/services/opsService'
import { cn } from '@/lib/utils'

type Entry = { id: string; title: string; subtitle?: string; href: string; icon: LucideIcon; keywords?: string; status?: string | null }

const ACTIONS: (Entry & { roles?: string[] })[] = [
  { id: 'a-order', title: 'New order', href: '/distribution/orders/new', icon: ClipboardList, keywords: 'create sale customer' },
  { id: 'a-shipment', title: 'New shipment', href: '/distribution/shipments/new', icon: Truck, keywords: 'create delivery dispatch' },
  { id: 'a-route', title: 'Plan a route', href: '/distribution/routes/new', icon: Route, keywords: 'create driver run stops' },
  { id: 'a-exception', title: 'Raise an exception', href: '/ops/exceptions?raise=1', icon: Siren, keywords: 'problem issue delay damage' },
  { id: 'a-receive', title: 'Receive stock', href: '/inventory/inventory-items/new', icon: ArrowDownToLine, keywords: 'goods in purchase receipt' },
  { id: 'a-adjust', title: 'Adjust stock', href: '/inventory/inventory-items', icon: SlidersHorizontal, keywords: 'count correct quantity' },
  { id: 'a-product', title: 'New product', href: '/inventory/products/new', icon: Package, keywords: 'create sku item' },
  { id: 'a-transfer', title: 'Move stock between warehouses', href: '/warehousing/transfers/new', icon: ArrowRightLeft, keywords: 'transfer', roles: ['company_owner', 'warehouse_manager'] },
  { id: 'a-production', title: 'Plan production', href: '/production/orders/new', icon: Factory, keywords: 'manufacture make', roles: ['company_owner', 'production_manager'] },
  { id: 'a-vehicle', title: 'Add a vehicle', href: '/ops/fleet?tab=vehicles', icon: Truck, keywords: 'fleet van truck' },
  { id: 'a-invite', title: 'Invite a teammate', href: '/company/users', icon: UserPlus, keywords: 'team member user', roles: ['company_owner'] },
]

const GROUP_ICON: Record<string, LucideIcon> = {
  shipments: Truck, orders: ClipboardList, products: Package, routes: Route, exceptions: Siren, vehicles: Truck, warehouses: Building2, people: User,
}

const RECENT_KEY = 'logiflow.palette.recent'
const readRecent = (): Entry[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }

const PaletteContext = createContext<{ open: () => void; available: boolean }>({ open: () => {}, available: false })
export const useCommandPalette = () => useContext(PaletteContext)

function flatten(items: NavItem[], parent?: string): Entry[] {
  return items.flatMap((i) => {
    if (i.children) return flatten(i.children, i.title)  // a section's own link is its "Overview" child
    return [{ id: `p-${i.href}-${i.title}`, title: parent && i.title === 'Overview' ? `${parent} overview` : i.title, subtitle: parent, href: i.href, icon: i.icon as LucideIcon, keywords: parent }]
  })
}

const matches = (e: Entry, q: string) => !q || `${e.title} ${e.subtitle ?? ''} ${e.keywords ?? ''}`.toLowerCase().includes(q.toLowerCase())

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { hasAnyRole } = useAuthUtils()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [searching, setSearching] = useState(false)
  const [recent, setRecent] = useState<Entry[]>([])
  const seq = useRef(0)

  // ⌘K / Ctrl+K anywhere; "/" when not typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v) }
      else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { if (open) { setRecent(readRecent()); setQuery(''); setGroups([]) } }, [open])

  // Server search for records, debounced; late answers for an older query are ignored
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setGroups([]); setSearching(false); return }
    setSearching(true)
    const id = ++seq.current
    const t = setTimeout(() => {
      opsService.search(q).then((r) => { if (id === seq.current) setGroups(r.groups) }).catch(() => { if (id === seq.current) setGroups([]) })
        .finally(() => { if (id === seq.current) setSearching(false) })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const pages = useMemo(() => flatten(navigation.filter((i) => !i.roles || hasAnyRole(i.roles))), [hasAnyRole])
  const actions = useMemo(() => ACTIONS.filter((a) => !a.roles || hasAnyRole(a.roles)), [hasAnyRole])
  const q = query.trim()
  const shownActions = actions.filter((a) => matches(a, q)).slice(0, q ? 4 : 5)
  const shownPages = pages.filter((p) => matches(p, q)).slice(0, q ? 5 : 6)
  const shownRecent = q ? [] : recent

  const go = useCallback((e: Entry) => {
    setOpen(false)
    if (!e.id.startsWith('a-') && !e.id.startsWith('p-')) {
      const next = [e, ...readRecent().filter((r) => r.href !== e.href)].slice(0, 5).map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle, href: r.href, status: r.status, keywords: r.keywords }))
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
    }
    router.push(e.href)
  }, [router])

  const record = (g: SearchGroup, i: SearchItem): Entry => ({ id: `r-${g.key}-${i.id}`, title: i.title, subtitle: i.subtitle, href: i.href, icon: GROUP_ICON[g.key] ?? Search, status: i.status, keywords: g.key })
  const empty = q.length >= 2 && !searching && !groups.length && !shownActions.length && !shownPages.length

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true), available: true }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search LogiFlow</DialogTitle>
          <DialogDescription className="sr-only">Find shipments, orders, products and people, open a page, or start a task.</DialogDescription>
          <Cmdk shouldFilter={false} loop className="flex flex-col" label="Search LogiFlow">
            <div className="flex items-center gap-2 border-b px-4">
              {searching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <Cmdk.Input value={query} onValueChange={setQuery} autoFocus placeholder="Search shipments, orders, products, people… or type a task"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm" />
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">Esc</kbd>
            </div>
            <Cmdk.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
              {empty && <p className="px-3 py-10 text-center text-sm text-muted-foreground">Nothing matches “{q}”.</p>}
              {q.length === 1 && <p className="px-3 py-2 text-xs text-muted-foreground">Keep typing to search records…</p>}
              {shownRecent.length > 0 && <Section heading="Recent">{shownRecent.map((e) => <Row key={e.href} e={{ ...e, icon: Clock }} onSelect={go} />)}</Section>}
              {groups.map((g) => <Section key={g.key} heading={g.label}>{g.items.map((i) => { const e = record(g, i); return <Row key={e.id} e={e} onSelect={go} /> })}</Section>)}
              {shownActions.length > 0 && <Section heading="Actions">{shownActions.map((e) => <Row key={e.id} e={{ ...e, icon: e.icon ?? Plus }} onSelect={go} action />)}</Section>}
              {shownPages.length > 0 && <Section heading="Go to">{shownPages.map((e) => <Row key={e.id} e={e} onSelect={go} />)}</Section>}
            </Cmdk.List>
            <div className="hidden items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↑</kbd><kbd className="rounded border bg-muted px-1">↓</kbd> move</span>
              <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1"><CornerDownLeft className="h-3 w-3" /></kbd> open</span>
              <span className="ml-auto flex items-center gap-1"><kbd className="rounded border bg-muted px-1">/</kbd> opens this from anywhere</span>
            </div>
          </Cmdk>
        </DialogContent>
      </Dialog>
    </PaletteContext.Provider>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Cmdk.Group heading={heading} className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
      {children}
    </Cmdk.Group>
  )
}

const STATUS_TONE: Record<string, string> = {
  DELIVERED: 'text-success', COMPLETED: 'text-success', RESOLVED: 'text-success', SHIPPED: 'text-info', IN_PROGRESS: 'text-info', IN_USE: 'text-info',
  OPEN: 'text-danger', FAILED: 'text-danger', CANCELLED: 'text-muted-foreground', INACTIVE: 'text-muted-foreground',
}

function Row({ e, onSelect, action }: { e: Entry; onSelect: (e: Entry) => void; action?: boolean }) {
  const Icon = e.icon
  return (
    <Cmdk.Item value={e.id} onSelect={() => onSelect(e)}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm aria-selected:bg-brand-soft aria-selected:text-foreground">
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', action ? 'bg-brand-soft text-brand' : 'bg-muted text-muted-foreground group-aria-selected:bg-card')}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{e.title}</span>
        {e.subtitle && <span className="block truncate text-xs text-muted-foreground">{e.subtitle}</span>}
      </span>
      {e.status && <span className={cn('shrink-0 text-[11px] font-medium', STATUS_TONE[e.status] ?? 'text-muted-foreground')}>{e.status.replace(/_/g, ' ').toLowerCase()}</span>}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
    </Cmdk.Item>
  )
}

/** The search box in the top bar that opens the palette (and shows the shortcut). */
export function SearchTrigger() {
  const { open, available } = useCommandPalette()
  const [mac, setMac] = useState(false)
  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) }, [])
  if (!available) return null
  return (
    <button onClick={open} aria-label="Search (Ctrl+K)"
      className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:w-64 sm:px-3">
      <Search className="h-4 w-4" />
      <span className="hidden flex-1 text-left sm:inline">Search or jump to…</span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">{mac ? '⌘' : 'Ctrl'} K</kbd>
    </button>
  )
}

