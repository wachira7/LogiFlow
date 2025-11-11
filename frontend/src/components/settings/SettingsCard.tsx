// components/settings/SettingsCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface SettingsCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  action?: React.ReactNode
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
            <div>
              <CardTitle>{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}