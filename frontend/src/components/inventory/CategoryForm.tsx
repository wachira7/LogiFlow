// src/components/inventory/CategoryForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderTree, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { stockService, type StockCategory } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'

/** Ids of a category and everything under it: none of these can become its parent. */
function descendants(all: StockCategory[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of all) if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) { out.add(c.id); grew = true }
  }
  return out
}

export function CategoryForm({ categoryId, parentId }: { categoryId?: string; parentId?: string }) {
  const router = useRouter()
  const [all, setAll] = useState<StockCategory[]>([])
  const [f, setF] = useState({ name: '', description: '', parent_id: parentId ?? '', is_active: true })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([stockService.categories(), categoryId ? stockService.category(categoryId) : Promise.resolve(null)])
      .then(([cats, c]) => {
        setAll(cats)
        if (c) setF({ name: c.name, description: c.description ?? '', parent_id: c.parent_id ?? '', is_active: c.is_active })
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Couldn’t load the form.'))
      .finally(() => setLoading(false))
  }, [categoryId])

  const blocked = categoryId ? descendants(all, categoryId) : new Set<string>()
  const parents = all.filter((c) => !blocked.has(c.id))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return setError('Name the category, e.g. “Cereals”.')
    setSaving(true); setError(null)
    const data = { name: f.name.trim(), description: f.description, parent_id: f.parent_id || null, is_active: f.is_active }
    try {
      const saved = categoryId ? await stockService.updateCategory(categoryId, data) : await stockService.createCategory(data)
      toast.success(categoryId ? 'Category saved' : `${saved.name} added`)
      router.push(`/inventory/categories/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the category.')
      setSaving(false)
    }
  }

  const back = categoryId ? { href: `/inventory/categories/${categoryId}`, label: 'Back to category' } : { href: '/inventory/categories', label: 'Categories' }
  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-72 max-w-2xl rounded-xl" /></div>
  if (loadError) return <div className="space-y-6"><PageHeader icon={FolderTree} title="Category" back={back} /><ErrorBanner message={loadError} /></div>

  return (
    <div className="space-y-6">
      <PageHeader icon={FolderTree} back={back} title={categoryId ? `Edit ${f.name || 'category'}` : 'New category'} description="Categories group products on reports and filters. Nest them as deep as you like." />
      <form onSubmit={submit} noValidate className="max-w-2xl">
        <Panel delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="c-name">Name</Label><Input id="c-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Cereals" autoFocus={!categoryId} /></div>
            <div className="space-y-1.5"><Label htmlFor="c-parent">Inside</Label>
              <Select value={f.parent_id || 'none'} onValueChange={(v) => setF({ ...f, parent_id: v === 'none' ? '' : v })}>
                <SelectTrigger id="c-parent" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Top level</SelectItem>{parents.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_path || c.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="c-desc">Description</Label><Textarea id="c-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm sm:col-span-2">
              <span><span className="font-medium">Active</span><span className="block text-xs text-muted-foreground">Inactive categories stay on old products but aren’t offered for new ones.</span></span>
              <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} aria-label="Active" />
            </label>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push(back.href)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{categoryId ? 'Save changes' : 'Create category'}</Button>
          </div>
        </Panel>
      </form>
    </div>
  )
}
