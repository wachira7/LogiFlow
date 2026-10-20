// src/app/(app)/inventory/categories/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, FolderOpen, FolderTree, Plus, Search, X } from 'lucide-react'
import { stockService, type StockCategory, type StockReport } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatusPill, TableSkeleton } from '@/components/app/kit'
import { FadeIn, ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import { formatMoney, toNumber } from '@/lib/format'

type Node = StockCategory & { kids: Node[] }

function buildTree(all: StockCategory[]): Node[] {
  const byId = new Map<string, Node>(all.map((c) => [c.id, { ...c, kids: [] }]))
  const roots: Node[] = []
  for (const n of byId.values()) {
    const parent = n.parent_id ? byId.get(n.parent_id) : undefined
    if (parent) parent.kids.push(n); else roots.push(n)
  }
  return roots
}

function Row({ node, depth, open, toggle, value }: { node: Node; depth: number; open: Set<string>; toggle: (id: string) => void; value: Map<string, number> }) {
  const reduce = useReducedMotion()
  const expanded = open.has(node.id)
  return (
    <li>
      <div className={cn('group flex items-center gap-2 border-b px-3 py-2.5 transition-colors hover:bg-muted/40 sm:px-4', !node.is_active && 'opacity-60')} style={{ paddingLeft: `${12 + depth * 22}px` }}>
        <button type="button" onClick={() => toggle(node.id)} disabled={!node.kids.length} aria-expanded={node.kids.length ? expanded : undefined}
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted disabled:invisible">
          <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
        </button>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{expanded && node.kids.length ? <FolderOpen className="h-4 w-4" /> : <FolderTree className="h-4 w-4" />}</span>
        <Link href={`/inventory/categories/${node.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium group-hover:underline">{node.name}</p>
          <p className="truncate text-xs text-muted-foreground">{node.products_count} {node.products_count === 1 ? 'product' : 'products'}{node.kids.length ? ` · ${node.kids.length} sub` : ''}{node.description ? ` · ${node.description}` : ''}</p>
        </Link>
        {!node.is_active && <StatusPill tone="neutral" className="hidden sm:inline-flex">Inactive</StatusPill>}
        <span className="hidden w-28 shrink-0 text-right text-sm tabular-nums text-muted-foreground sm:block">{value.has(node.id) ? formatMoney(value.get(node.id)!, undefined, { maximumFractionDigits: 0 }) : '—'}</span>
      </div>
      <AnimatePresence initial={false}>
        {expanded && node.kids.length > 0 && (
          <motion.ul initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
            {node.kids.map((k) => <Row key={k.id} node={k} depth={depth + 1} open={open} toggle={toggle} value={value} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

export default function CategoriesPage() {
  const router = useRouter()
  const [all, setAll] = useState<StockCategory[] | null>(null)
  const [report, setReport] = useState<StockReport | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    stockService.categories().then((c) => { setAll(c); setOpen(new Set(c.filter((x) => !x.parent_id).map((x) => x.id))) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load categories.'))
    stockService.report().then(setReport).catch(() => {})
  }, [])

  const tree = useMemo(() => buildTree(all ?? []), [all])
  const value = useMemo(() => new Map((report?.by_category ?? []).filter((c) => c.id).map((c) => [c.id!, toNumber(c.value)])), [report])
  const q = query.trim().toLowerCase()
  const matches = q ? (all ?? []).filter((c) => `${c.full_path} ${c.description}`.toLowerCase().includes(q)) : []
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="space-y-6">
      <PageHeader icon={FolderTree} title="Categories" description={all ? `${all.length} ${all.length === 1 ? 'category' : 'categories'} grouping your products` : 'Group products for filters and reports.'}
        actions={<Button onClick={() => router.push('/inventory/categories/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New category</Button>} />
      {all && all.length > 0 && (
        <FadeIn delay={0.05} className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a category…" className="bg-card pl-9 pr-9" aria-label="Search categories" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
          </div>
          {!q && <div className="flex gap-2 text-sm">
            <Button variant="ghost" size="sm" onClick={() => setOpen(new Set(all.map((c) => c.id)))}>Expand all</Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(new Set())}>Collapse all</Button>
          </div>}
        </FadeIn>
      )}
      {error && <ErrorBanner title="Couldn’t load categories" message={error} />}
      {!all ? <TableSkeleton rows={5} cols={3} /> : all.length === 0 ? (
        <EmptyState icon={<FolderTree />} title="No categories yet" description="Start with broad groups like “Cereals” or “Beverages”; add subcategories later."
          action={<Button onClick={() => router.push('/inventory/categories/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New category</Button>} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden justify-between border-b bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:flex"><span>Category</span><span>Stock value</span></div>
          {q ? (
            matches.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted-foreground">No category matches “{query}”.</p> : (
              <ul>{matches.map((c) => <Row key={c.id} node={{ ...c, name: c.full_path || c.name, kids: [] }} depth={0} open={open} toggle={toggle} value={value} />)}</ul>
            )
          ) : <ul className="-mb-px">{tree.map((n) => <Row key={n.id} node={n} depth={0} open={open} toggle={toggle} value={value} />)}</ul>}
        </FadeIn>
      )}
    </div>
  )
}
