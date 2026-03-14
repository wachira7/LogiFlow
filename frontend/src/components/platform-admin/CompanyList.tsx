// frontend/src/components/platform-admin/CompanyList.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Building2, MoreHorizontal, Search, Users, DollarSign, Activity, Ban, CheckCircle, Trash2, RefreshCw, Eye } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { CompanyOverview, CompanyManagementData } from '@/types/platform.types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface CompanyListProps {
  companies: CompanyOverview[]
  isLoading: boolean
  onManageCompany: (data: CompanyManagementData) => Promise<boolean>
  onRefresh: () => void
}

export function CompanyList({ companies, isLoading, onManageCompany, onRefresh }: CompanyListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyOverview | null>(null)
  const [actionType, setActionType] = useState<'ACTIVATE' | 'SUSPEND' | 'DELETE' | 'RESET_TRIAL' | null>(null)
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.subscription_status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAction = (company: CompanyOverview, action: typeof actionType) => {
    setSelectedCompany(company)
    setActionType(action)
    setReason('')
  }

  const confirmAction = async () => {
    if (!selectedCompany || !actionType) return

    setIsProcessing(true)
    const success = await onManageCompany({
      company_id: selectedCompany.company_id,
      action: actionType,
      reason: reason || `${actionType} action by platform admin`,
      notify_users: true,
    })

    setIsProcessing(false)
    if (success) {
      setSelectedCompany(null)
      setActionType(null)
      setReason('')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trial':
      case 'trialing':
        return 'bg-blue-100 text-blue-800'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionTitle = () => {
    switch (actionType) {
      case 'ACTIVATE':
        return 'Activate Company'
      case 'SUSPEND':
        return 'Suspend Company'
      case 'DELETE':
        return 'Delete Company'
      case 'RESET_TRIAL':
        return 'Reset Trial Period'
      default:
        return ''
    }
  }

  const getActionDescription = () => {
    switch (actionType) {
      case 'ACTIVATE':
        return `Are you sure you want to activate ${selectedCompany?.company_name}? This will restore full access to all features.`
      case 'SUSPEND':
        return `Are you sure you want to suspend ${selectedCompany?.company_name}? Users will lose access to the platform.`
      case 'DELETE':
        return `Are you sure you want to delete ${selectedCompany?.company_name}? This action cannot be undone and will permanently remove all data.`
      case 'RESET_TRIAL':
        return `Reset the trial period for ${selectedCompany?.company_name}? This will extend their trial by 14 days.`
      default:
        return ''
    }
  }

  if (isLoading && companies.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <LoadingSpinner size="lg" text="Loading companies..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Companies</span>
              </CardTitle>
              <CardDescription>
                Manage all companies on the platform
              </CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{companies.length}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {companies.filter(c => c.is_active).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">
                      {companies.reduce((sum, c) => sum + c.user_count, 0)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(companies.reduce((sum, c) => sum + c.total_revenue, 0))}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No companies found matching your search' : 'No companies yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.company_id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {company.company_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.is_active ? 'default' : 'destructive'}>
                          {company.is_active ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><Ban className="w-3 h-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(company.subscription_status)}>
                          {company.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{company.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(company.total_revenue)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(company.last_activity)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(company.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                               onClick={() => router.push(`/platform-admin/companies/${company.company_id}`)}
                                >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {company.is_active ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleAction(company, 'SUSPEND')}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-green-600"
                                onClick={() => handleAction(company, 'ACTIVATE')}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAction(company, 'RESET_TRIAL')}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Reset Trial
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleAction(company, 'DELETE')}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Reason (optional)
            </label>
            <Input
              placeholder="Enter reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isProcessing}
              className={actionType === 'DELETE' || actionType === 'SUSPEND' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
