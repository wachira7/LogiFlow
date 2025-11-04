// frontend/src/components/platform-admin/PlatformSettings.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { Settings, Plus, Edit, Trash2, Search, RefreshCw, Save, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { PlatformSetting, CreatePlatformSettingData, UpdatePlatformSettingData } from '@/types/platform.types'
import { formatDate } from '@/lib/utils'

interface PlatformSettingsProps {
  settings: PlatformSetting[]
  isLoading: boolean
  onCreateSetting: (data: CreatePlatformSettingData) => Promise<boolean>
  onUpdateSetting: (id: string, data: UpdatePlatformSettingData) => Promise<boolean>
  onDeleteSetting: (id: string) => Promise<boolean>
  onRefresh: () => void
}

export function PlatformSettings({ 
  settings, 
  isLoading, 
  onCreateSetting, 
  onUpdateSetting, 
  onDeleteSetting,
  onRefresh 
}: PlatformSettingsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<PlatformSetting | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreatePlatformSettingData>({
    setting_key: '',
    setting_value: '',
    description: '',
    is_active: true,
  })

  // Filter settings
  const filteredSettings = settings.filter(setting =>
    setting.setting_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    setting.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      setting_key: '',
      setting_value: '',
      description: '',
      is_active: true,
    })
  }

  const handleCreate = async () => {
    setIsProcessing(true)
    const success = await onCreateSetting(formData)
    setIsProcessing(false)
    
    if (success) {
      setIsCreateDialogOpen(false)
      resetForm()
    }
  }

  const handleEdit = (setting: PlatformSetting) => {
    setSelectedSetting(setting)
    setFormData({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      description: setting.description,
      is_active: setting.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedSetting) return

    setIsProcessing(true)
    // Only send updatable fields (exclude setting_key)
    const updateData = {
        setting_value: formData.setting_value,
        description: formData.description,
        is_active: formData.is_active,
    }
    const success = await onUpdateSetting(selectedSetting.id, updateData)
    setIsProcessing(false)
    
    if (success) {
        setIsEditDialogOpen(false)
        setSelectedSetting(null)
        resetForm()
    }
 }

  const handleDelete = (setting: PlatformSetting) => {
    setSelectedSetting(setting)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedSetting) return

    setIsProcessing(true)
    const success = await onDeleteSetting(selectedSetting.id)
    setIsProcessing(false)
    
    if (success) {
      setIsDeleteDialogOpen(false)
      setSelectedSetting(null)
    }
  }

  if (isLoading && settings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <LoadingSpinner size="lg" text="Loading settings..." />
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
                <Settings className="w-5 h-5" />
                <span>Platform Settings</span>
              </CardTitle>
              <CardDescription>
                Manage platform-wide configuration and settings
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Setting
              </Button>
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Settings</p>
                    <p className="text-2xl font-bold">{settings.length}</p>
                  </div>
                  <Settings className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {settings.filter(s => s.is_active).length}
                    </p>
                  </div>
                  <Settings className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {settings.filter(s => !s.is_active).length}
                    </p>
                  </div>
                  <Settings className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modified By</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No settings found matching your search' : 'No settings configured yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{setting.setting_key}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm max-w-xs truncate block">
                          {setting.setting_value.length > 50 
                            ? `${setting.setting_value.slice(0, 50)}...` 
                            : setting.setting_value}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground max-w-xs truncate block">
                          {setting.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                          {setting.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {setting.modified_by_email || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(setting.updated_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(setting)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(setting)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Setting</DialogTitle>
            <DialogDescription>
              Add a new platform-wide configuration setting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="setting_key">Setting Key *</Label>
              <Input
                id="setting_key"
                placeholder="e.g., max_file_upload_size"
                value={formData.setting_key}
                onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting_value">Setting Value *</Label>
              <Textarea
                id="setting_value"
                placeholder="Enter setting value..."
                value={formData.setting_value}
                onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this setting does..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isProcessing || !formData.setting_key || !formData.setting_value}
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Creating...' : 'Create Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
            <DialogDescription>
              Update the configuration setting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_setting_key">Setting Key</Label>
              <Input
                id="edit_setting_key"
                value={formData.setting_key}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_setting_value">Setting Value *</Label>
              <Textarea
                id="edit_setting_value"
                placeholder="Enter setting value..."
                value={formData.setting_value}
                onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                placeholder="Describe what this setting does..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedSetting(null)
                resetForm()
              }}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={isProcessing || !formData.setting_value}
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Updating...' : 'Update Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the setting &quot;{selectedSetting?.setting_key}&quot;? 
              This action cannot be undone and may affect platform functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}