//app/inventory/categories/new/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCategories } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, FolderTree } from 'lucide-react'

function NewCategoryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedParentId = searchParams.get('parent_id') || ''

  const { createCategory, categories } = useCategories()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: preselectedParentId, // preselected from URL
    is_active: true
  })

  // Find preselected parent name for display
  const preselectedParent = categories.find(c => c.id === preselectedParentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    setIsLoading(true)
    try {
      const submitData = {
        ...formData,
        parent_id: formData.parent_id === 'none' || formData.parent_id === ''
          ? null
          : formData.parent_id
      }
      await createCategory(submitData)

      // Navigate back to parent category if we came from one
      if (preselectedParentId) {
        router.push(`/inventory/categories/${preselectedParentId}`)
      } else {
        router.push('/inventory/categories')
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={preselectedParentId
          ? `/inventory/categories/${preselectedParentId}`
          : '/inventory/categories'
        }>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Category</h1>
          <p className="text-muted-foreground">
            {preselectedParent
              ? `Creating a subcategory under "${preselectedParent.name}"`
              : 'Create a new product category'
            }
          </p>
        </div>
      </div>

      {/* Breadcrumb hint when parent is preselected */}
      {preselectedParent && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <FolderTree className="h-4 w-4" />
          <span>Parent:</span>
          <Badge variant="secondary">{preselectedParent.name}</Badge>
          <span>→ New Subcategory</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select
                  value={formData.parent_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {categories.filter(cat => cat.is_active).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description (optional)"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active Category</Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={preselectedParentId
                ? `/inventory/categories/${preselectedParentId}`
                : '/inventory/categories'
              }>
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading || !formData.name}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewCategoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <NewCategoryForm />
    </Suspense>
  )
}