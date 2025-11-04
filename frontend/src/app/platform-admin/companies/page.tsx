// frontend/src/app/platform-admin/companies/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
//import { PrivateRoute } from '@/components/auth/AuthGuard'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { CompanyList } from '@/components/platform-admin/CompanyList'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, Building2, AlertCircle } from 'lucide-react'


function CompaniesPageContent() {
  const {
    companies,
    isLoadingCompanies,
    companiesError,
    fetchCompanies,
    manageCompany,
  } = usePlatformAdmin()

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  if (companiesError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{companiesError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Building2 className="w-8 h-8" />
              <span>Company Management</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage all companies on the platform
            </p>
          </div>
        </div>
      </div>

      {/* Company List */}
      <CompanyList
        companies={companies}
        isLoading={isLoadingCompanies}
        onManageCompany={manageCompany}
        onRefresh={fetchCompanies}
      />
    </div>
  )
}

export default function CompaniesPage() {
  return <CompaniesPageContent />
}
