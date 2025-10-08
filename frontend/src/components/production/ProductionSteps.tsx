// src/components/production/ProductionSteps.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProductionSteps } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, MoreVertical, Play, CheckCircle, SkipForward, ListChecks, AlertCircle } from 'lucide-react'
import type { ProductionStepStatus } from '@/types/production.types'

export function ProductionSteps() {
  const router = useRouter()
  const { 
    steps = [],
    loading, 
    fetchSteps,
    startStep,
    completeStep,
    skipStep
  } = useProductionSteps()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductionStepStatus | 'ALL'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // FIRST define the function
  const loadSteps = useCallback(async () => {
        const filters = statusFilter !== 'ALL' ? { status: statusFilter } : undefined
        await fetchSteps(filters)
    }, [statusFilter, fetchSteps]) // Add dependencies

  // THEN use it in useEffect
  useEffect(() => {
        loadSteps()
    }, [loadSteps])

  const handleSearch = async () => {
    const filters = {
      ...(statusFilter !== 'ALL' && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }
    await fetchSteps(filters)
  }

  const handleStartStep = async (id: string) => {
    setActionLoading(id)
    try {
      await startStep(id)
      await loadSteps()
    } catch (error) {
      console.error('Failed to start step:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteStep = async (id: string) => {
    setActionLoading(id)
    try {
      await completeStep(id)
      await loadSteps()
    } catch (error) {
      console.error('Failed to complete step:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkipStep = async (id: string) => {
    if (confirm('Are you sure you want to skip this step?')) {
      setActionLoading(id)
      try {
        await skipStep(id)
        await loadSteps()
      } catch (error) {
        console.error('Failed to skip step:', error)
      } finally {
        setActionLoading(null)
      }
    }
  }

  const getStatusBadge = (status: ProductionStepStatus) => {
    const variants: Record<ProductionStepStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
      SKIPPED: { variant: 'destructive', label: 'Skipped' },
    }
    
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredSteps = steps.filter(step =>
    step.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (step.description && step.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production Steps</h2>
          <p className="text-muted-foreground">
            Track and manage production steps across all orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by step name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ProductionStepStatus | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="SKIPPED">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steps Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production Steps ({filteredSteps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredSteps.length === 0 ? (
            <div className="text-center py-12">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No production steps found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'ALL' 
                  ? 'Try adjusting your filters'
                  : 'Production steps will appear here when orders are created'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step Name</TableHead>
                    <TableHead>Production Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration (hrs)</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSteps.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{step.name}</p>
                          {step.description && (
                            <p className="text-sm text-muted-foreground max-w-xs truncate">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal"
                          onClick={() => router.push(`/production/orders/${step.production_order_id}`)}
                        >
                          View Order
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(step.status)}
                          {step.is_overdue && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {step.duration_hours ? (
                          <span>
                            {step.duration_hours}
                            {step.actual_duration_hours && (
                              <span className="text-xs text-muted-foreground ml-1 block">
                                (actual: {step.actual_duration_hours.toFixed(1)})
                              </span>
                            )}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{step.assigned_to_name || 'Unassigned'}</TableCell>
                      <TableCell>
                        {step.start_time 
                          ? new Date(step.start_time).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {step.end_time 
                          ? new Date(step.end_time).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {step.status === 'PENDING' && (
                              <DropdownMenuItem
                                onClick={() => handleStartStep(step.id)}
                                disabled={actionLoading === step.id}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start Step
                              </DropdownMenuItem>
                            )}

                            {step.status === 'IN_PROGRESS' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleCompleteStep(step.id)}
                                  disabled={actionLoading === step.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSkipStep(step.id)}
                                  disabled={actionLoading === step.id}
                                >
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Skip
                                </DropdownMenuItem>
                              </>
                            )}

                            {(step.status === 'PENDING' || step.status === 'IN_PROGRESS') && (
                              <DropdownMenuItem
                                onClick={() => handleSkipStep(step.id)}
                                disabled={actionLoading === step.id}
                                className="text-orange-600"
                              >
                                <SkipForward className="h-4 w-4 mr-2" />
                                Skip Step
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
