// /src/components/inventory/warehouses/WarehouseList.tsx
'use client'

import { useState } from 'react'
import { useWarehouses } from '@/hooks/useInventory'
import { Warehouse as WarehouseType } from '@/types/inventory.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Warehouse,
  Eye,
  MapPin,
  User,
  Package
} from 'lucide-react'
import Link from 'next/link'

export function WarehouseList() {
  const { warehouses, isLoading, deleteWarehouse } = useWarehouses()
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filteredWarehouses = warehouses?.filter(warehouse => {
    const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = showInactive || warehouse.is_active
    return matchesSearch && matchesStatus
  }) || []

  const handleDelete = async (warehouseId: string) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await deleteWarehouse(warehouseId)
      } catch (error) {
        console.error('Failed to delete warehouse:', error)
      }
    }
  }

  const formatCapacity = (capacity: number | null) => {
    if (!capacity) return '-'
    return new Intl.NumberFormat('en-US').format(capacity) + ' sq ft'
  }

  const formatAddress = (warehouse: WarehouseType) => {
    const parts = [warehouse.address, warehouse.city, warehouse.state, warehouse.country]
      .filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '-'
  }

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
        <div>
          <h2 className="text-2xl font-bold">Warehouses</h2>
          <p className="text-muted-foreground">Manage your warehouse locations</p>
        </div>
        <Link href="/inventory/warehouses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Show Active Only' : 'Show All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Warehouses ({filteredWarehouses.length})</span>
            <Warehouse className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWarehouses.length === 0 ? (
            <EmptyState
              icon={<Warehouse className="h-5 w-5" />}              
              title="No warehouses found"
              description={searchTerm ? "No warehouses match your search." : "Get started by creating your first warehouse."}
              action={
                <Link href="/inventory/warehouses/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Warehouse
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium flex items-center space-x-2">
                          <Warehouse className="h-4 w-4 text-muted-foreground" />
                          <span>{warehouse.name}</span>
                        </div>
                        {warehouse.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {warehouse.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {warehouse.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-sm max-w-[200px]">
                          {formatAddress(warehouse)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {warehouse.manager_name ? (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{warehouse.manager_name}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatCapacity(warehouse.capacity as number)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {warehouse.phone && (
                          <div className="text-sm">{warehouse.phone}</div>
                        )}
                        {warehouse.email && (
                          <div className="text-sm text-muted-foreground">{warehouse.email}</div>
                        )}
                        {!warehouse.phone && !warehouse.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/warehouses/${warehouse.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/warehouses/${warehouse.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(warehouse.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}