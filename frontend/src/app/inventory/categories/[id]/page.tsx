// /app/inventory/categories/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useRecordById } from '@/hooks/useRecordById'
import { inventoryService } from '@/services/inventoryService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, FolderTree } from 'lucide-react'

export default function CategoryDetailPage() {
  const params = useParams()
  const categoryId = params?.id as string
  const { record: category, isLoading } = useRecordById(categoryId, (id) => inventoryService.getCategory(id))

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FolderTree className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Category not found</h2>
        </div>
        <Link href="/inventory/categories"><Button>Back to Categories</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory/categories">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground">Category Details</p>
          </div>
        </div>
        <Link href={`/inventory/categories/${category.id}/edit`}>
          <Button><Edit className="mr-2 h-4 w-4" />Edit Category</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1 font-medium">{category.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={category.is_active ? "default" : "secondary"}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Parent Category</label>
              <p className="mt-1">{category.parent?.name || 'None'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Product Count</label>
              <p className="mt-1">{category.products_count || 0}</p>
            </div>
          </div>
          {category.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1">{category.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
