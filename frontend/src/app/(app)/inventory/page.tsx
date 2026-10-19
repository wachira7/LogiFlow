// src/app/inventory/page.tsx
'use client'

import Link from 'next/link'
import { useInventoryDashboard, useCategories, useWarehouses, useProducts } from '@/hooks/useInventory'
import { LowStockAlert } from '@/components/inventory/products/LowStockAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Package, FolderTree, Building, AlertTriangle,TrendingUp, Plus, Eye, BarChart3, ArrowLeft, CheckCircle2, Circle, ChevronRight, ArrowRight } from 'lucide-react'

export default function InventoryPage() {
  const { stats, isLoading } = useInventoryDashboard()
  const { categories } = useCategories()
  const { warehouses } = useWarehouses()
  const { products } = useProducts()

  // Setup steps logic
  const setupSteps = [
    {
      id: 1,
      title: 'Create Categories',
      description: 'Organise your products into categories first',
      href: '/inventory/categories/new',
      viewHref: '/inventory/categories',
      icon: FolderTree,
      completed: (categories?.length || 0) > 0,
      count: categories?.length || 0,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 2,
      title: 'Add Warehouses',
      description: 'Define where your stock will be stored',
      href: '/inventory/warehouses/new',
      viewHref: '/inventory/warehouses',
      icon: Building,
      completed: (warehouses?.length || 0) > 0,
      count: warehouses?.length || 0,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950',
      border: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 3,
      title: 'Add Products',
      description: 'Create products that belong to your categories',
      href: '/inventory/products/new',
      viewHref: '/inventory/products',
      icon: Package,
      completed: (products?.length || 0) > 0,
      count: products?.length || 0,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 4,
      title: 'Stock Inventory',
      description: 'Assign products to warehouses with quantities',
      href: '/inventory/inventory-items/new',
      viewHref: '/inventory/inventory-items',
      icon: TrendingUp,
      completed: (stats?.total_inventory_items || 0) > 0,
      count: stats?.total_inventory_items || 0,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950',
      border: 'border-orange-200 dark:border-orange-800'
    }
  ]

  const completedSteps = setupSteps.filter(s => s.completed).length
  const setupProgress = Math.round((completedSteps / setupSteps.length) * 100)
  const isSetupComplete = completedSteps === setupSteps.length
  const nextStep = setupSteps.find(s => !s.completed)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
            <p className="text-muted-foreground">
              Monitor your inventory status and manage stock levels
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide - shown when not complete */}
      {!isSetupComplete && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>🚀 Getting Started</span>
                  <Badge variant="secondary">{completedSteps} of {setupSteps.length} complete</Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Follow these steps to set up your inventory module
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{setupProgress}%</div>
                <div className="text-xs text-muted-foreground">complete</div>
              </div>
            </div>
            <Progress value={setupProgress} className="mt-3 h-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {setupSteps.map((step, index) => {
                const Icon = step.icon
                const isNext = step.id === nextStep?.id
                return (
                  <div
                    key={step.id}
                    className={`relative rounded-lg border p-4 transition-all ${
                      step.completed
                        ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
                        : isNext
                        ? `${step.border} ${step.bg} ring-2 ring-primary/20`
                        : 'border-muted bg-muted/30 opacity-60'
                    }`}
                  >
                    {/* Step number connector */}
                    {index < setupSteps.length - 1 && (
                      <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-md ${step.completed ? 'bg-green-100 dark:bg-green-900' : step.bg}`}>
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Icon className={`h-4 w-4 ${isNext ? step.color : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">Step {step.id}</span>
                    </div>

                    <div className="mb-3">
                      <div className={`font-medium text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                      {step.completed && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          ✓ {step.count} {step.count === 1 ? 'item' : 'items'} added
                        </div>
                      )}
                    </div>

                    {step.completed ? (
                      <Link href={step.viewHref}>
                        <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </Link>
                    ) : isNext ? (
                      <Link href={step.href}>
                        <Button size="sm" className="w-full h-7 text-xs">
                          <Plus className="mr-1 h-3 w-3" />
                          Start
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="ghost" className="w-full h-7 text-xs" disabled>
                        <Circle className="mr-1 h-3 w-3" />
                        Pending
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Next action banner */}
            {nextStep && (
              <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Next: <span className="text-primary">{nextStep.title}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">— {nextStep.description}</span>
                </div>
                <Link href={nextStep.href}>
                  <Button size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    {nextStep.title}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup complete banner */}
      {isSetupComplete && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  Inventory is fully set up!
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  All {setupSteps.length} setup steps completed
                </div>
              </div>
            </div>
            <Badge className="bg-green-600">Active</Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_categories || 0}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_warehouses || 0}</div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.low_stock_count || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common inventory management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/inventory/products/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Plus className="h-6 w-6" />
                <span>Add Product</span>
              </Button>
            </Link>
            <Link href="/inventory/categories/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <FolderTree className="h-6 w-6" />
                <span>Add Category</span>
              </Button>
            </Link>
            <Link href="/inventory/warehouses/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Building className="h-6 w-6" />
                <span>Add Warehouse</span>
              </Button>
            </Link>
            <Link href="/inventory/inventory-items/new">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Package className="h-6 w-6" />
                <span>Add Stock</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

     {/* Low Stock & Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Low Stock Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockAlert compact showViewAll limit={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/inventory/products">
              <Button variant="ghost" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Products
              </Button>
            </Link>
            <Link href="/inventory/categories">
              <Button variant="ghost" className="w-full justify-start">
                <FolderTree className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Link href="/inventory/warehouses">
              <Button variant="ghost" className="w-full justify-start">
                <Building className="mr-2 h-4 w-4" />
                Warehouses
              </Button>
            </Link>
            <Link href="/inventory/inventory-items">
              <Button variant="ghost" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" />
                Stock Levels
              </Button>
            </Link>
            <Link href="/inventory/transactions">
              <Button variant="ghost" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Transactions
              </Button>
            </Link>
            <Link href="/inventory/reports">
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}