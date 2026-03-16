// components/company/UserInvitations.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserPlus, Mail, MoreVertical, RefreshCw, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CompanyService } from '@/services/companyService'
import { USER_ROLES } from '@/types/company.types'
import type { Invitation, CreateInvitationData, UserRole } from '@/types/company.types'
import { useToast } from '@/hooks/use-toast'

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.string().min(1, 'Please select a role'),
  message: z.string().optional(),
})

interface UserInvitationsProps {
  invitations: Invitation[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

const getStatusColor = (status: Invitation['status']) => {
  switch (status) {
    case 'pending':
      return 'default'
    case 'accepted':
      return 'default'
    case 'expired':
      return 'secondary'
    case 'revoked':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getStatusIcon = (status: Invitation['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3" />
    case 'accepted':
      return <CheckCircle className="w-3 h-3" />
    case 'expired':
    case 'revoked':
      return <XCircle className="w-3 h-3" />
    default:
      return <Clock className="w-3 h-3" />
  }
}

export function UserInvitations({ invitations, isLoading, onRefresh }: UserInvitationsProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: '',
      message: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof invitationSchema>) => {
    setIsSubmitting(true)
    
    try {
      const invitationData: CreateInvitationData = {
        email: values.email,
        role: values.role as UserRole,
        message: values.message,
      }
      
      const response = await CompanyService.createInvitation(invitationData)
      
      if (response.success) {
        toast({
          title: "Invitation sent",
          description: `Invitation sent to ${values.email} successfully`,
        })
        form.reset()
        setIsInviteDialogOpen(false)
        await onRefresh()
      } else {
        toast({
          variant: "destructive",
          title: "Invitation failed",
          description: response.error || "Failed to send invitation",
        })
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string, email: string) => {
    setActionLoading(invitationId)
    
    try {
      const response = await CompanyService.resendInvitation(invitationId)
      
      if (response.success) {
        toast({
          title: "Invitation resent",
          description: `Invitation resent to ${email}`,
        })
        await onRefresh()
      } else {
        toast({
          variant: "destructive",
          title: "Resend failed",
          description: response.error || "Failed to resend invitation",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to resend invitation",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    setActionLoading(invitationId)
    
    try {
      const response = await CompanyService.revokeInvitation(invitationId)
      
      if (response.success) {
        toast({
          title: "Invitation revoked",
          description: `Invitation for ${email} has been revoked`,
        })
        await onRefresh()
      } else {
        toast({
          variant: "destructive",
          title: "Revoke failed",
          description: response.error || "Failed to revoke invitation",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to revoke invitation",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleLabel = (role: string) => {
    return USER_ROLES.find(r => r.value === role)?.label || role
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="lg" text="Loading invitations..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Invitations</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage invitations sent to team members
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new team member to join your company.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="colleague@company.com"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {USER_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div>
                                    <div className="font-medium">{role.label}</div>
                                    <div className="text-xs text-muted-foreground">{role.description}</div>
                                  </div>
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
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personal Message (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Join our team at..."
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Add a personal message to the invitation email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsInviteDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">No invitations yet</h3>
            <p className="text-sm mb-4">Start by inviting team members to join your company</p>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Send First Invitation
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getRoleLabel(invitation.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(invitation.status)} className="capitalize">
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(invitation.status)}
                          <span>{invitation.status}</span>
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invitation.invited_by_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invitation.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {actionLoading === invitation.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                              disabled={actionLoading === invitation.id}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                              disabled={actionLoading === invitation.id}
                              className="text-destructive"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Revoke
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}