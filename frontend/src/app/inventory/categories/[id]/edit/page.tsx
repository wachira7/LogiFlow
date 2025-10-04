// src/app/inventory/categories/[id]/edit/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCategories } from '@/hooks/useInventory'
import { CategoryForm } from '@/components/inventory/categories/CategoryForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FolderTree } from 'lucide-react'
import Link from 'next/link'

export default function EditCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params?.id as string
  const { categories, isLoading } = useCategories()

  const category = categories.find(cat => cat.id === categoryId)

  const handleSuccess = () => {
    // Navigate back to category detail page after successful update
    router.push(`/inventory/categories/${categoryId}`)
  }

  const handleCancel = () => {
    // Navigate back to category detail page
    router.push(`/inventory/categories/${categoryId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FolderTree className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Category not found</h2>
          <p className="text-muted-foreground">The category you&apos;re trying to edit does not exist.</p>
        </div>  
        <Link href="/inventory/categories">
          <Button>Back to Categories</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href={`/inventory/categories/${categoryId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
          <p className="text-muted-foreground">Update {category.name} details</p>
        </div>
      </div>

      {/* Category Form */}
      <CategoryForm
        categoryId={categoryId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}