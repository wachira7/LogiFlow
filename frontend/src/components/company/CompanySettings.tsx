// components/company/CompanySettings.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Shield, Bell, Globe, Clock } from 'lucide-react'
import { CURRENCIES, TIMEZONES } from '@/types/company.types'
import type { CompanySettings, SettingsFormData } from '@/types/company.types'
import { useToast } from '@/hooks/use-toast'

const settingsSchema = z.object({
  timezone: z.string().min(1, 'Please select a timezone'),
  currency: z.string().min(1, 'Please select a currency'),
  date_format: z.string().min(1, 'Please select a date format'),
  time_format: z.string().min(1, 'Please select a time format'),
  language: z.string().min(1, 'Please select a language'),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  marketing_emails: z.boolean(),
  fiscal_year_start: z.string().min(1, 'Please select fiscal year start'),
  working_days: z.array(z.string()).min(1, 'Please select at least one working day'),
  working_hours_start: z.string().min(1, 'Please select start time'),
  working_hours_end: z.string().min(1, 'Please select end time'),
  require_2fa: z.boolean(),
  session_timeout: z.number().min(5).max(480),
})

interface CompanySettingsProps {
  settings: CompanySettings | null
  isLoading: boolean
  onUpdate: (data: SettingsFormData) => Promise<void>
}

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const TIME_FORMATS = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'sw', label: 'Swahili' },
]

const FISCAL_MONTHS = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
]

const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const WORK_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

export function CompanySettings({ settings, isLoading, onUpdate }: CompanySettingsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { toast } = useToast()

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      timezone: settings?.timezone || 'UTC',
      currency: settings?.currency || 'USD',
      date_format: settings?.date_format || 'MM/DD/YYYY',
      time_format: settings?.time_format || '12h',
      language: settings?.language || 'en',
      email_notifications: settings?.email_notifications ?? true,
      push_notifications: settings?.push_notifications ?? true,
      marketing_emails: settings?.marketing_emails ?? false,
      fiscal_year_start: settings?.fiscal_year_start || 'january',
      working_days: settings?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      working_hours_start: settings?.working_hours_start || '09:00',
      working_hours_end: settings?.working_hours_end || '17:00',
      require_2fa: settings?.require_2fa ?? false,
      session_timeout: settings?.session_timeout || 60,
    },
  })

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    setIsSaving(true)
    try {
      await onUpdate(values)
      toast({
        title: "Settings updated",
        description: "Your company settings have been updated successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:error instanceof Error ? error.message : "Failed to update company settings",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="lg" text="Loading settings..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your company preferences and operational settings
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">
                  <Globe className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="business">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Regional Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((timezone) => (
                                <SelectItem key={timezone} value={timezone}>
                                  {timezone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.symbol} {currency.name} ({currency.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DATE_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIME_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Preferences</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications about important updates via email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="push_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Push Notifications</FormLabel>
                            <FormDescription>
                              Receive push notifications in your browser
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marketing_emails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Marketing Emails</FormLabel>
                            <FormDescription>
                              Receive updates about new features and company news
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Fiscal Year</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="fiscal_year_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fiscal Year Start Month</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {FISCAL_MONTHS.map((month) => (
                                  <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The month your fiscal year begins
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium">Working Schedule</h3>
                    <div className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="working_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Working Days</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                              {WEEKDAYS.map((day) => (
                                <div key={day.value} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={day.value}
                                    checked={field.value.includes(day.value)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, day.value])
                                      } else {
                                        field.onChange(field.value.filter(d => d !== day.value))
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <Label htmlFor={day.value} className="text-sm">
                                    {day.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <FormDescription>
                              Select the days your company operates
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="working_hours_start"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {WORK_HOURS.map((hour) => (
                                    <SelectItem key={hour.value} value={hour.value}>
                                      {hour.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="working_hours_end"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {WORK_HOURS.map((hour) => (
                                    <SelectItem key={hour.value} value={hour.value}>
                                      {hour.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Security Settings</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="require_2fa"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Require Two-Factor Authentication</FormLabel>
                            <FormDescription>
                              Require all team members to use two-factor authentication
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="session_timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Timeout (minutes)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                              <SelectItem value="240">4 hours</SelectItem>
                              <SelectItem value="480">8 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How long users stay logged in without activity
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-6 border-t">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}