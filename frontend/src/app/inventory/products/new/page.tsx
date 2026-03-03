//src/app/inventory/products/new/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/inventory/products/ProductForm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/inventory/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">Create a new product in your inventory</p>
        </div>
      </div>
      <ProductForm
        onSuccess={() => router.push('/inventory/products')}
        onCancel={() => router.push('/inventory/products')}
      />
    </div>
  )
}