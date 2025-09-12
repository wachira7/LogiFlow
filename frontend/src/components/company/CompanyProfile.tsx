// components/company/CompanyProfile.tsx
'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Building, Upload, Save, Pencil } from 'lucide-react'
import { CompanyService } from '@/services/companyService'
import { INDUSTRIES } from '@/types/company.types'
import type { Company, CompanyFormData } from '@/types/company.types'
import { useToast } from '@/hooks/use-toast'

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  email: z.string().email('Please enter a valid email address'),
  description: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
})

interface CompanyProfileProps {
  company: Company | null
  isLoading: boolean
  onUpdate: (data: CompanyFormData) => Promise<void>
}

export function CompanyProfile({ company, isLoading, onUpdate }: CompanyProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      industry: company?.industry || '',
      email: company?.email || '',
      description: company?.description || '',
      website: company?.website || '',
      phone: company?.phone || '',
      address: company?.address || '',
      city: company?.city || '',
      state: company?.state || '',
      country: company?.country || '',
      postal_code: company?.postal_code || '',
    },
  })

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image under 2MB",
      })
      return
    }

    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select a JPG, PNG, or SVG image",
      })
      return
    }

    setIsUploading(true)
    
    try {
      const response = await CompanyService.uploadLogo(file)
      
      if (response.success) {
        // Update the form data to include the new logo
        await onUpdate({ logo: file })
        toast({
          title: "Logo updated",
          description: "Your company logo has been updated successfully",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: response.error || "Failed to upload logo",
        })
      }
    } catch (error: unknown) {
        toast({
            variant: "destructive",
            title: "Upload error",
            description: (error as Error).message || "An unexpected error occurred while uploading",
        })
        }
    finally {
        setIsUploading(false)
        }
    }

  const onSubmit = async (values: z.infer<typeof companySchema>) => {
    setIsSaving(true)
    
    try {
      await onUpdate(values)
      setIsEditing(false)
      toast({
        title: "Company updated",
        description: "Your company profile has been updated successfully",
      })
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: (error as Error).message || "Failed to update company profile",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="lg" text="Loading company profile..." />
        </CardContent>
      </Card>
    )
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Company profile not found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={company.logo} alt={company.name} />
              <AvatarFallback className="text-2xl">
                {company.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div>
                <h3 className="font-medium">{company.name}</h3>
                <p className="text-sm text-muted-foreground">{company.industry}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Change Logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or SVG. Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Information</CardTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    form.reset()
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            /* View Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">Company Name</Label>
                <p className="text-sm text-muted-foreground mt-1">{company.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Industry</Label>
                <p className="text-sm text-muted-foreground mt-1">{company.industry}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{company.email}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Website</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {company.website}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-sm text-muted-foreground mt-1">{company.phone || 'Not provided'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Team Size</Label>
                <p className="text-sm text-muted-foreground mt-1">{company.user_count} members</p>
              </div>
              
              {company.description && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{company.description}</p>
                </div>
              )}
              
              {(company.address || company.city || company.state || company.country) && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[company.address, company.city, company.state, company.postal_code, company.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Edit Mode */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your company..."
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of your company and what you do.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Address Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}