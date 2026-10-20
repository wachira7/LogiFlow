// src/app/(app)/inventory/categories/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Edit, FolderTree, Package, Plus, Trash2 } from 'lucide-react'
import { stockService, type StockCategory, type StockProduct } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel, StatusPill } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, MotionRow } from '@/components/app/motion'
import { StockPill } from '@/components/inventory/status'
import { formatCount, formatMoney } from '@/lib/format'

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cat, setCat] = useState<StockCategory | null>(null)
  const [subs, setSubs] = useState<StockCategory[]>([])
  const [products, setProducts] = useState<StockProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, s, p] = await Promise.all([stockService.category(id), stockService.categories({ parent: id }), stockService.products({ category: id })])
      setCat(c); setSubs(s); setProducts(p.results); setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load this category.') }
  }, [id])
  useEffect(() => { load() }, [load])

  const remove = async () => {
    setBusy(true)
    try { await stockService.deleteCategory(id); toast.success('Category deleted'); router.push('/inventory/categories') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete it.'); setConfirm(false) }
    finally { setBusy(false) }
  }

  const back = cat?.parent_id ? { href: `/inventory/categories/${cat.parent_id}`, label: cat.parent_name ?? 'Parent' } : { href: '/inventory/categories', label: 'Categories' }
  if (error && !cat) return <div className="space-y-6"><PageHeader icon={FolderTree} title="Category" back={back} /><ErrorBanner message={error} onRetry={load} /></div>
  if (!cat) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-64 rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <PageHeader icon={FolderTree} back={back} title={cat.name}
        description={<span className="flex flex-wrap items-center gap-2">{!cat.is_active && <StatusPill tone="neutral">Inactive</StatusPill>}<span>{cat.description || cat.full_path}</span></span>}
        actions={<>
          <Button variant="outline" onClick={() => router.push(`/inventory/categories/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="outline" className="text-danger hover:text-danger" onClick={() => setConfirm(true)} aria-label="Delete category"><Trash2 className="h-4 w-4" /></Button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={Package} title={`Products (${cat.products_count})`} bodyClassName="p-0" delay={0.05}
          action={<Button size="sm" variant="outline" onClick={() => router.push('/inventory/products/new')}><Plus className="mr-1 h-3.5 w-3.5" />Product</Button>}>
          {!products ? <div className="p-5"><Skeleton className="h-32" /></div> : products.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No products in this category yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {products.map((p, i) => (
                    <MotionRow key={p.id} index={i} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/inventory/products/${p.id}`)}>
                      <td className="px-4 py-3 sm:px-5"><p className="font-medium">{p.name}</p><p className="font-mono text-xs text-muted-foreground">{p.sku}</p></td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCount(p.total_stock)} <span className="text-xs text-muted-foreground">{p.unit_of_measure}</span></td>
                      <td className="hidden px-3 py-3 sm:table-cell"><StockPill quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} /></td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums sm:px-5">{formatMoney(p.unit_price)}</td>
                    </MotionRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel icon={FolderTree} title="Subcategories" delay={0.1}
          action={<Button size="sm" variant="ghost" className="text-brand" onClick={() => router.push(`/inventory/categories/new?parent_id=${id}`)}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>}>
          {subs.length === 0 ? <p className="text-sm text-muted-foreground">None. Add one to split this category further.</p> : (
            <AppStagger className="space-y-2">
              {subs.map((s) => (
                <AppStaggerItem key={s.id}>
                  <Link href={`/inventory/categories/${s.id}`} className="card-lift flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                    <span className="font-medium">{s.name}</span><span className="text-xs text-muted-foreground">{s.products_count} products</span>
                  </Link>
                </AppStaggerItem>
              ))}
            </AppStagger>
          )}
        </Panel>
      </div>

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={busy} variant="destructive" title={`Delete ${cat.name}?`}
        description={cat.products_count ? `Its ${cat.products_count} products stay, but become uncategorised. Categories with subcategories can’t be deleted.` : "Categories with subcategories can’t be deleted. Move them first."} confirmText="Delete" cancelText="Keep it" onConfirm={remove} />
    </div>
  )
}
