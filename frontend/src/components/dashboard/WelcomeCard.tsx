'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Calendar, Sparkles } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Image from 'next/image'

export function WelcomeCard() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="md" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded animate-pulse w-48" />
              <div className="h-4 bg-muted rounded animate-pulse w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Failed to load dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { user, company, stats } = data
  const isNewUser = stats.days_active <= 1

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome back, {user.name.split(' ')[0]}!
                </h1>
                {isNewUser && (
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className="text-muted-foreground max-w-lg">
                {isNewUser 
                  ? "Welcome to LogiFlow! Let's get your logistics operations up and running."
                  : "Here's what's happening with your logistics operations"
                }
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Building className="w-4 h-4" />
                <span className="font-medium">{company.name}</span>
                {company.industry && company.industry !== 'Not specified' && (
                  <Badge variant="outline" className="text-xs">
                    {company.industry}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {stats.days_active === 0 
                    ? 'Just started today!' 
                    : stats.days_active === 1
                    ? '1 day active'
                    : `${stats.days_active} days active`
                  }
                </span>
                {isNewUser && (
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
            </div>

            {!isNewUser && (
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{stats.total_products}</div>
                  <div className="text-xs text-muted-foreground">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{stats.pending_orders}</div>
                  <div className="text-xs text-muted-foreground">Pending Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{stats.total_users}</div>
                  <div className="text-xs text-muted-foreground">Team Members</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {company.logo ? (
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}