// frontend/src/app/profile/page.tsx
'use client'

import { useState } from 'react'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Mail, Phone, Building2, Shield, Calendar, Camera, Save, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function ProfilePageContent() {
  const { user, updateProfile, uploadAvatar, changePassword } = useAuth()
  
  // Profile update state
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState('')

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  if (!user) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>User data not available</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get user initials for avatar
  const getInitials = () => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  // Get role badge color
  const getRoleBadgeColor = () => {
    if (user.is_platform_admin) return 'bg-purple-100 text-purple-800'
    if (user.is_company_owner) return 'bg-blue-100 text-blue-800'
    if (user.is_warehouse_manager) return 'bg-green-100 text-green-800'
    if (user.is_production_manager) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  // Get display role
  const getDisplayRole = () => {
    if (user.is_platform_admin) return 'Platform Administrator'
    if (user.is_company_owner) return 'Company Owner'
    if (user.is_warehouse_manager) return 'Warehouse Manager'
    if (user.is_production_manager) return 'Production Manager'
    if (user.is_logistics_coordinator) return 'Logistics Coordinator'
    if (user.is_inventory_manager) return 'Inventory Manager'
    if (user.is_driver) return 'Driver'
    return 'User'
  }

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setUpdateSuccess(false)
    setUpdateError('')

    const success = await updateProfile(profileData)

    if (success) {
      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } else {
      setUpdateError('Failed to update profile')
    }

    setIsUpdating(false)
  }

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)
    setPasswordSuccess(false)
    setPasswordError('')

    // Validate passwords match
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('New passwords do not match')
      setIsChangingPassword(false)
      return
    }

    // Validate password length
    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
      setIsChangingPassword(false)
      return
    }

    const success = await changePassword({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
      new_password_confirm: passwordData.new_password_confirm,
    })

    if (success) {
      setPasswordSuccess(true)
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } else {
      setPasswordError('Failed to change password. Check your current password.')
    }

    setIsChangingPassword(false)
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5MB')
      return
    }

    setIsUploadingAvatar(true)
    setAvatarError('')

    const success = await uploadAvatar(file)

    if (!success) {
      setAvatarError('Failed to upload avatar')
    }

    setIsUploadingAvatar(false)
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.profile_picture || user.avatar} />
                <AvatarFallback className="text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{user.full_name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge className={getRoleBadgeColor()}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getDisplayRole()}
                </Badge>
                {!user.is_platform_admin && user.company_name && (
                  <Badge variant="outline">
                    <Building2 className="w-3 h-3 mr-1" />
                    {user.company_name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-1" />
                Member since {formatDate(user.date_joined)}
              </div>
            </div>
          </div>

          {avatarError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{avatarError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Profile and Security */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile Information
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        first_name: e.target.value 
                      }))}
                      placeholder="Enter your first name"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        last_name: e.target.value 
                      }))}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone_number"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        phone_number: e.target.value 
                      }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <Separator />

                {/* Success/Error Messages */}
                {updateSuccess && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Profile updated successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {updateError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{updateError}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      current_password: e.target.value 
                    }))}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      new_password: e.target.value 
                    }))}
                    placeholder="Enter your new password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password_confirm">
                    Confirm New Password
                  </Label>
                  <Input
                    id="new_password_confirm"
                    type="password"
                    value={passwordData.new_password_confirm}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      new_password_confirm: e.target.value 
                    }))}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>

                {/* Success/Error Messages */}
                {passwordSuccess && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Password changed successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {passwordError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <PrivateRoute>
      <ProfilePageContent />
    </PrivateRoute>
  )
}

