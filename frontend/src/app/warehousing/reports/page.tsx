// src/app/warehousing/reports/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useTransferItems } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { 
  AlertCircle, 
  TrendingUp, 
  FileText,
  Download 
} from 'lucide-react'

export default function WarehousingReportsPage() {
  const { 
    insufficientStock, 
    popularTransfers, 
    loading, 
    fetchInsufficientStockReport,
    fetchPopularTransfers 
  } = useTransferItems()

  const [activeTab, setActiveTab] = useState('insufficient-stock')

  useEffect(() => {
    fetchInsufficientStockReport()
    fetchPopularTransfers()
  }, [fetchInsufficientStockReport, fetchPopularTransfers])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Warehousing Reports</h2>
          <p className="text-muted-foreground">
            Analyze transfer data and identify issues
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </Button>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="insufficient-stock">
            <AlertCircle className="h-4 w-4 mr-2" />
            Insufficient Stock
          </TabsTrigger>
          <TabsTrigger value="popular-transfers">
            <TrendingUp className="h-4 w-4 mr-2" />
            Popular Transfers
          </TabsTrigger>
        </TabsList>

        {/* Insufficient Stock Report */}
        <TabsContent value="insufficient-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  Insufficient Stock Items
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {insufficientStock?.total_items_with_shortage || 0} items with shortages
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!insufficientStock?.insufficient_stock_items || 
               insufficientStock.insufficient_stock_items.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="h-12 w-12 text-muted-foreground/50" />}
                  title="No stock shortages"
                  description="All pending transfers have sufficient stock"
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Shortage</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insufficientStock.insufficient_stock_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.transfer_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.product_sku}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{item.source_warehouse}</TableCell>
                          <TableCell>{item.required_quantity}</TableCell>
                          <TableCell>{item.available_stock}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {item.shortage}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.item_value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">
                          Total Shortage Value: {formatCurrency(insufficientStock.total_shortage_value)}
                        </p>
                        <p className="text-sm text-red-700">
                          These transfers cannot be completed until stock is replenished
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Transfers Report */}
        <TabsContent value="popular-transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Most Frequently Transferred Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!popularTransfers?.popular_transfer_products || 
               popularTransfers.popular_transfer_products.length === 0 ? (
                <EmptyState
                  icon={<FileText />}
                  title="No transfer data"
                  description="Complete some transfers to see popular products"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Transfer Count</TableHead>
                      <TableHead className="text-right">Total Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularTransfers.popular_transfer_products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {product.product__name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.product__sku}
                        </TableCell>
                        <TableCell>{product.transfer_count} transfers</TableCell>
                        <TableCell className="text-right font-medium">
                          {product.total_quantity} units
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
