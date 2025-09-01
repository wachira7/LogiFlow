// components/dashboard/SetupProgress.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle, ArrowRight, Target } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Link from 'next/link'

export function SetupProgress() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Setup Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Loading setup progress..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Setup Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load setup progress</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { setup_progress } = data
  const progressPercentage = (setup_progress.completed_steps / setup_progress.total_steps) * 100
  const isComplete = setup_progress.completed_steps === setup_progress.total_steps
  const nextStep = setup_progress.steps.find(step => !step.completed)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Setup Progress</span>
          </div>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {setup_progress.completed_steps} of {setup_progress.total_steps}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isComplete ? 'Setup Complete!' : 'Getting Started'}
            </span>
            <span className="font-medium">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          {isComplete ? (
            <p className="text-sm text-green-600">
              All setup steps completed! You&apos;re ready to use LogiFlow.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete {setup_progress.total_steps - setup_progress.completed_steps} more steps to unlock all features
            </p>
          )}
        </div>

        {/* Setup Steps */}
        <div className="space-y-3">
          {setup_progress.steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                step.completed
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    step.completed ? 'text-green-800 dark:text-green-200' : 'text-foreground'
                  }`}>
                    {step.title}
                  </h4>
                  {step.completed && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Complete
                    </Badge>
                  )}
                </div>
                <p className={`text-xs mt-1 ${
                  step.completed 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-muted-foreground'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Next Action */}
        {!isComplete && nextStep && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Next Step:</h4>
                <p className="text-sm text-muted-foreground">{nextStep.title}</p>
              </div>
              <Button size="sm" asChild>
                <Link href="/company/profile">
                  Continue Setup
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Completion Celebration */}
        {isComplete && (
          <div className="pt-4 border-t bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg">
            <div className="text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Setup Complete!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                You&apos;re all set to manage your logistics operations with LogiFlow.
              </p>
              <Button size="sm" variant="outline" asChild className="mt-3">
                <Link href="/dashboard/analytics">
                  Explore Analytics
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}