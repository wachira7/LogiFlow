//src/components/inventory/warehouses/WarehouseForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Warehouse } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthService } from '@/services/authService'
import { inventoryService } from '@/services/inventoryService'
import { useRecordById } from '@/hooks/useRecordById'

type TeamMember = { id: string; first_name?: string; last_name?: string; email: string }

interface WarehouseFormProps {
  warehouseId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface WarehouseFormData {
  name: string
  code: string
  description: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  manager_id: string
  capacity: string
  is_active: boolean
}

export function WarehouseForm({ warehouseId, onSuccess, onCancel }: WarehouseFormProps) {
  const { createWarehouse, updateWarehouse, isLoading } = useWarehouses()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    AuthService.getCompanyUsers().then((res) => {
      const data = res.data as unknown
      const list = Array.isArray(data) ? data : (data as { results?: TeamMember[] } | undefined)?.results ?? []
      setTeamMembers(list as TeamMember[])
    })
  }, [])
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    code: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    manager_id: '',
    capacity: '',
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!warehouseId
  const { record: currentWarehouse } = useRecordById(warehouseId, (id) => inventoryService.getWarehouse(id))

  // Load existing warehouse data for editing
  useEffect(() => {
    if (isEditing && currentWarehouse) {
      setFormData({
        name: currentWarehouse.name,
        code: currentWarehouse.code || '',
        description: currentWarehouse.description || '',
        address: currentWarehouse.address || '',
        city: currentWarehouse.city || '',
        state: currentWarehouse.state || '',
        postal_code: currentWarehouse.postal_code || '',
        country: currentWarehouse.country || '',
        phone: currentWarehouse.phone || '',
        email: currentWarehouse.email || '',
        manager_id: currentWarehouse.manager_id || '',
        capacity: currentWarehouse.capacity?.toString() || '',
        is_active: currentWarehouse.is_active
      })
    }
  }, [isEditing, currentWarehouse])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Warehouse code is required'
    }

    if (formData.code.length > 20) {
      newErrors.code = 'Warehouse code must be less than 20 characters'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }


    if (formData.capacity && isNaN(parseFloat(formData.capacity))) {
      newErrors.capacity = 'Capacity must be a valid number'
    }

    if (formData.phone && formData.phone.length > 0 && formData.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits'
    }


    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const submitData = {
        ...formData,
        manager_id: formData.manager_id || null,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      }

      if (isEditing) {
        await updateWarehouse(warehouseId!, submitData)
      } else {
        await createWarehouse(submitData)
      }

      onSuccess?.()
    } catch (error) {
      setErrors({ submit: error instanceof Error && error.message ? error.message : 'Failed to save warehouse. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof WarehouseFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Warehouse className="h-5 w-5" />
          <span>{isEditing ? 'Edit Warehouse' : 'Create New Warehouse'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter warehouse name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Warehouse Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="WH001"
                  className={errors.code ? 'border-destructive' : ''}
                />
                {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter warehouse description"
                rows={3}
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Location</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter full address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="warehouse@company.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Manager: a member of your team */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manager</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="manager_id">Warehouse manager</Label>
                <Select
                  value={formData.manager_id || 'none'}
                  onValueChange={(value) => handleInputChange('manager_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="manager_id" className="w-full">
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Their email and phone come from their profile.</p>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (units of stock)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  placeholder="10000"
                  className={errors.capacity ? 'border-destructive' : ''}
                />
                {errors.capacity && <p className="text-sm text-destructive">{errors.capacity}</p>}
              </div>

              <div className="flex items-center space-x-2 mt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active Warehouse</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !formData.name.trim() || !formData.code.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Warehouse' : 'Create Warehouse'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}