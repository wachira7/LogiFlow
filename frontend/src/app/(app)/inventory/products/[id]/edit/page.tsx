// src/app/inventory/products/[id]/edit/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useProduct } from '@/hooks/useInventory'
import { ProductForm } from '@/components/inventory/products/ProductForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id as string
  const { product, isLoading } = useProduct(productId)

  const handleSuccess = () => {
    // Navigate back to product detail page after successful update
    router.push(`/inventory/products/${productId}`)
  }

  const handleCancel = () => {
    // Navigate back to product detail page
    router.push(`/inventory/products/${productId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Product not found</h2>
          <p className="text-muted-foreground">The product you&apos;re trying to edit doesn&apos;t exist.</p>
        </div>
        <Link href="/inventory/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href={`/inventory/products/${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground">Update {product.name} details</p>
        </div>
      </div>

      {/* Product Form */}
      <ProductForm
        productId={productId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}