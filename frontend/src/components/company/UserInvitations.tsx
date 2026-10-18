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
import { UserPlus, Mail, MoreVertical, RefreshCw, X, Clock, CheckCircle, XCircle, Copy, Check, AlertTriangle, MessageCircle, Link2 } from 'lucide-react'
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

type InviteOutcome = { email: string; emailSent: boolean; url?: string; reminder?: boolean }

/** Honest outcome of an invite: was it emailed? Either way, a link to copy or share on WhatsApp. */
function InviteResult({ outcome, onAnother, onDone }: { outcome: InviteOutcome; onAnother?: () => void; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!outcome.url) return
    await navigator.clipboard.writeText(outcome.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const whatsapp = outcome.url
    ? `https://wa.me/?text=${encodeURIComponent(`You're invited to join our team on LogiFlow: ${outcome.url}`)}`
    : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${outcome.emailSent ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
          {outcome.emailSent ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div>
          <h3 className="font-semibold">
            {outcome.emailSent
              ? `${outcome.reminder ? 'Reminder' : 'Invitation'} emailed to ${outcome.email}`
              : `We couldn’t email ${outcome.email}`}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {outcome.emailSent
              ? 'You can also share the link below directly. It works for 7 days.'
              : 'The invitation is ready. Copy the link and send it by WhatsApp, SMS or any chat app. It works for 7 days.'}
          </p>
        </div>
      </div>
      {outcome.url && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <input readOnly value={outcome.url} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <><Check className="mr-1.5 h-4 w-4 text-success" />Copied</> : <><Copy className="mr-1.5 h-4 w-4" />Copy link</>}
            </Button>
          </div>
          <Button asChild variant="outline" className="w-full">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
            </a>
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onAnother && <Button variant="outline" onClick={onAnother}>Invite another</Button>}
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function UserInvitations({ invitations, isLoading, onRefresh }: UserInvitationsProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null)
  const { toast } = useToast()

  const openDialog = (open: boolean) => {
    setIsInviteDialogOpen(open)
    if (!open) setOutcome(null)
  }

  const copyLink = async (url?: string) => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast({ title: 'Invite link copied', description: 'Paste it into WhatsApp, SMS or email.' })
  }

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
        // Show what really happened (emailed or not) with a link to share either way
        setOutcome({ email: values.email, emailSent: !!response.data?.email_sent, url: response.data?.invitation_url })
        form.reset()
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
        setOutcome({ email, emailSent: !!response.data?.email_sent, url: response.data?.invitation_url, reminder: true })
        setIsInviteDialogOpen(true)
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
            
            <Dialog open={isInviteDialogOpen} onOpenChange={openDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{outcome ? (outcome.reminder ? 'Invitation renewed' : 'Invitation created') : 'Invite Team Member'}</DialogTitle>
                  <DialogDescription>
                    {outcome ? 'Here’s what happened and how to share it.' : 'Send an invitation to a new team member to join your company.'}
                  </DialogDescription>
                </DialogHeader>
                
                {outcome ? (
                  <InviteResult
                    outcome={outcome}
                    onAnother={outcome.reminder ? undefined : () => setOutcome(null)}
                    onDone={() => openDialog(false)}
                  />
                ) : (
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
                            Included in the invitation email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openDialog(false)}
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
                )}
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
            <Button onClick={() => openDialog(true)}>
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
                            <DropdownMenuItem onClick={() => copyLink(invitation.invitation_url)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy invite link
                            </DropdownMenuItem>
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