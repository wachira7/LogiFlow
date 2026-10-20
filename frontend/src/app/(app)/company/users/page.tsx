// src/app/(app)/company/users/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Clock, Copy, Loader2, Mail, MoreHorizontal, RefreshCw, Search, Send, ShieldCheck, UserMinus, UserPlus, UserRoundCheck, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { teamService, ROLES, roleLabel, type CompanyInfo, type Member, type PendingInvitation, type Role } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel, StatusPill, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { formatDay, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const initials = (m: { full_name?: string; email: string }) =>
  (m.full_name && m.full_name !== m.email ? m.full_name : m.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

function SeatBar({ company }: { company: CompanyInfo }) {
  const { seats_used: used, seats_limit: limit } = company
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0
  return (
    <FadeIn delay={0.05} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Users className="h-5 w-5" /></span>
      <div className="flex-1 space-y-1.5">
        <p className="text-sm">
          <span className="font-semibold">{used}{limit ? ` of ${limit}` : ''}</span> seats used
          <span className="text-muted-foreground"> · members plus pending invitations{company.subscription_plan ? ` · ${company.subscription_plan} plan` : ''}</span>
        </p>
        {limit ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-brand')} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No seat limit on your current plan.</p>
        )}
      </div>
      {limit && used >= limit && <Button asChild size="sm" variant="outline"><Link href="/billing/plans">Get more seats</Link></Button>}
    </FadeIn>
  )
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PendingInvitation | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setEmail(''); setRole('member'); setMessage(''); setError(null); setResult(null); setCopied(false)
    }
  }, [open])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const inv = await teamService.invite(email.trim(), role, message.trim() || undefined)
      setResult(inv)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!result?.invitation_url) return
    await navigator.clipboard?.writeText(result.invitation_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <div className="space-y-4 text-center">
            <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-full', result.email_sent ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
              {result.email_sent ? <Send className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
            </motion.span>
            <DialogHeader className="items-center">
              <DialogTitle>{result.email_sent ? 'Invitation sent' : 'Invitation created'}</DialogTitle>
              <DialogDescription>
                {result.email_sent ? <>We emailed <span className="font-medium text-foreground">{result.email}</span>. You can also share the link yourself.</> : <>The email couldn’t be sent, so share this link with <span className="font-medium text-foreground">{result.email}</span> (WhatsApp, SMS…).</>}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 truncate text-left text-xs">{result.invitation_url}</code>
              <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</Button>
            </div>
            <p className="text-xs text-muted-foreground">The link works for 7 days.</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>Invite someone else</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
              <DialogDescription>They’ll get a link to create their account and join your company.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" autoFocus required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="inv-role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}><span className="font-medium">{r.label}</span><span className="ml-2 text-xs text-muted-foreground">{r.hint}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-msg">Personal note <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="inv-msg" rows={2} maxLength={500} placeholder="Welcome aboard! You’ll be running the Mombasa depot." value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy || !email.trim()} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function TeamPage() {
  const { user } = useAuth()
  const isOwner = !!user?.is_company_owner
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [invites, setInvites] = useState<PendingInvitation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [inviting, setInviting] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; description: string; label: string; run: () => Promise<void> } | null>(null)

  const load = useCallback(async () => {
    try {
      const [c, m, i] = await Promise.all([teamService.company(), teamService.members(), isOwner ? teamService.invitations() : Promise.resolve([])])
      setCompany(c); setMembers(m); setInvites(i); setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load the team.')
    }
  }, [isOwner])

  useEffect(() => {
    load()
  }, [load])

  const act = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id)
    try {
      await fn()
      toast.success(done)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const visible = (members ?? []).filter((m) => !query || [m.full_name, m.email, roleLabel(m.role)].some((v) => v.toLowerCase().includes(query.toLowerCase())))
  const active = (members ?? []).filter((m) => m.is_active).length

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="Team" description={members ? `${active} active ${active === 1 ? 'member' : 'members'}${invites.length ? ` · ${invites.length} invited` : ''}` : 'Everyone in your company.'}
        actions={isOwner ? <Button onClick={() => setInviting(true)} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><UserPlus className="mr-2 h-4 w-4" />Invite</Button> : undefined} />

      {error && <ErrorBanner title="Couldn’t load the team" message={error} onRetry={load} />}
      {company && isOwner && <SeatBar company={company} />}

      {isOwner && invites.length > 0 && (
        <Panel icon={Clock} title="Pending invitations" description="Not accepted yet" bodyClassName="p-0" delay={0.08}>
          <ul className="divide-y">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground"><Mail className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(inv.role)} · invited by {inv.invited_by_name || 'you'} · {inv.is_expired ? <span className="text-danger">expired</span> : `expires ${formatDay(inv.expires_at)}`}</p>
                  </div>
                </div>
                <div className="flex gap-1 sm:justify-end">
                  <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard?.writeText(inv.invitation_url); toast.success('Link copied') }}><Copy className="mr-1 h-3.5 w-3.5" />Link</Button>
                  <Button size="sm" variant="ghost" disabled={busy === inv.id} onClick={() => act(inv.id, async () => {
                    const r = await teamService.resend(inv.id)
                    if (!r.email_sent) toast.warning('Renewed, but the email couldn’t be sent. Share the link instead.')
                  }, 'Invitation renewed for 7 days')}><RefreshCw className="mr-1 h-3.5 w-3.5" />{inv.is_expired ? 'Renew' : 'Resend'}</Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-danger" disabled={busy === inv.id}
                    onClick={() => setConfirm({ title: 'Revoke this invitation?', description: `The link sent to ${inv.email} will stop working.`, label: 'Revoke', run: () => act(inv.id, () => teamService.revoke(inv.id), 'Invitation revoked') })}>
                    <X className="mr-1 h-3.5 w-3.5" />Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <FadeIn delay={0.1} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or role…" className="bg-card pl-9" aria-label="Search team" />
      </FadeIn>

      {!members ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <FadeIn delay={0.12} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Person</th><th className="px-3 py-3 font-medium">Role</th><th className="hidden px-3 py-3 font-medium md:table-cell">Last active</th><th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((m, i) => (
                  <MotionRow key={m.id} index={i} className={cn('transition-colors hover:bg-muted/40', !m.is_active && 'opacity-60')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-brand/10">
                          <AvatarImage src={m.profile_picture ?? undefined} />
                          <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">{initials(m)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.full_name}{m.is_you && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {isOwner && !m.is_you && m.is_active ? (
                        <Select value={m.role} disabled={busy === m.id} onValueChange={(v) => act(m.id, () => teamService.updateMember(m.id, { role: v as Role }), `${m.full_name} is now ${roleLabel(v)}`)}>
                          <SelectTrigger className="h-8 w-48" aria-label={`Role for ${m.full_name}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">{m.role === 'company_owner' && <ShieldCheck className="h-3.5 w-3.5 text-brand" />}{roleLabel(m.role)}</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">{m.last_login ? timeAgo(m.last_login) : 'Never signed in'}</td>
                    <td className="px-3 py-3"><StatusPill tone={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Active' : 'Deactivated'}</StatusPill></td>
                    <td className="px-5 py-3 text-right">
                      {isOwner && !m.is_you && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${m.full_name}`}>{busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Joined {formatDay(m.date_joined)}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {m.is_active ? (
                              <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setConfirm({
                                title: `Deactivate ${m.full_name}?`, description: 'They’re signed out everywhere and can’t sign in. Their history stays. You can reactivate them any time.', label: 'Deactivate',
                                run: () => act(m.id, () => teamService.updateMember(m.id, { is_active: false }), `${m.full_name} deactivated`),
                              })}><UserMinus className="mr-2 h-4 w-4" />Deactivate</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => act(m.id, () => teamService.updateMember(m.id, { is_active: true }), `${m.full_name} reactivated`)}><UserRoundCheck className="mr-2 h-4 w-4" />Reactivate</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No one matches “{query}”.</p>}
        </FadeIn>
      )}

      {isOwner && <InviteDialog open={inviting} onOpenChange={setInviting} onDone={load} />}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={confirm?.title ?? ''} description={confirm?.description ?? ''}
        confirmText={confirm?.label} variant="destructive" loading={!!busy} onConfirm={async () => { await confirm?.run() }} />
    </div>
  )
}
