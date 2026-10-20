// src/components/ops/ShipmentTimeline.tsx
// Everything that happened to a shipment, with proof of delivery and its exceptions, plus the share link.
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Camera, Check, Copy, ExternalLink, History, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { opsService, type Timeline } from '@/services/opsService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { formatDateTime, timeAgo } from '@/lib/format'
import { useLiveRefresh } from '@/lib/realtime'
import { EventIcon, ExceptionStatusPill, SeverityPill } from './status'
import { RaiseExceptionDialog } from './RaiseExceptionDialog'

export function ShipmentTimeline({ shipmentId, refreshKey = 0 }: { shipmentId: string; refreshKey?: number }) {
  const [data, setData] = useState<Timeline | null>(null)
  const [raise, setRaise] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => { opsService.timeline(shipmentId).then(setData).catch(() => setData(null)) }, [shipmentId])
  useEffect(() => { load() }, [load, refreshKey])
  useLiveRefresh(['shipment.event', 'exception.updated'], load, {
    when: (m) => { const d = m.data as { shipment?: { id: string }; shipment_id?: string }; return (d.shipment?.id ?? d.shipment_id) === shipmentId },
  })

  if (!data) return <Panel icon={History} title="Timeline"><Skeleton className="h-40" /></Panel>
  const link = typeof window !== 'undefined' ? `${window.location.origin}/track/${data.shipment.public_token}` : ''
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.success('Tracking link copied. Send it to your customer.'); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Couldn’t copy. Long-press the link to copy it instead.') }
  }
  const open = data.exceptions.filter((e) => e.status === 'OPEN' || e.status === 'ACKNOWLEDGED')

  return (
    <div className="space-y-6">
      <Panel title="Customer tracking link" description="Anyone with this link sees progress and a live ETA, never the driver’s details or the full address" delay={0.05}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{link}</code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-success" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}Copy</Button>
            <Button variant="outline" size="sm" asChild><a href={link} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open</a></Button>
          </div>
        </div>
      </Panel>

      <Panel icon={AlertTriangle} title={`Exceptions${open.length ? ` (${open.length} open)` : ''}`} delay={0.1} bodyClassName="p-0"
        action={<Button size="sm" variant="outline" onClick={() => setRaise(true)}><Plus className="mr-1 h-3.5 w-3.5" />Raise</Button>}>
        {data.exceptions.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">No problems reported.</p> : (
          <ul className="divide-y">
            {data.exceptions.map((e) => (
              <li key={e.id}><Link href={`/ops/exceptions?open=${e.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/40 sm:px-5">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.type_label} · {timeAgo(e.created_at)}{e.owner_name ? ` · ${e.owner_name}` : ''}</p></div>
                <div className="flex shrink-0 gap-1.5"><SeverityPill severity={e.severity} /><ExceptionStatusPill status={e.status} /></div>
              </Link></li>
            ))}
          </ul>
        )}
      </Panel>

      {data.proofs.length > 0 && (
        <Panel icon={Camera} title="Proof of delivery" delay={0.15}>
          <div className="space-y-4">
            {data.proofs.map((p) => (
              <div key={p.id} className="space-y-3">
                <p className="text-sm"><span className="font-medium">{p.recipient_name || 'Recipient not named'}</span> <span className="text-muted-foreground">· {formatDateTime(p.captured_at)}{p.captured_by ? ` · by ${p.captured_by}` : ''}</span></p>
                <div className="grid grid-cols-2 gap-3">
                  {p.signature_url && <a href={p.signature_url} target="_blank" rel="noreferrer" className="block rounded-lg border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.signature_url} alt={`Signature of ${p.recipient_name || 'recipient'}`} className="h-24 w-full object-contain" /></a>}
                  {p.photo_url && <a href={p.photo_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo_url} alt="Delivery photo" className="h-28 w-full object-cover" /></a>}
                </div>
                {p.latitude != null && <a className="text-xs text-brand hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}>Where it was captured</a>}
                {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel icon={History} title="Timeline" delay={0.2}>
        {data.events.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
          <AppStagger className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
            {data.events.map((e) => (
              <AppStaggerItem key={e.id} className="relative flex gap-3">
                <EventIcon type={e.type} toStatus={e.to_status} />
                <div className="min-w-0 pt-1"><p className="text-sm font-medium">{e.message || e.type}</p>
                  <p className="text-xs text-muted-foreground" title={formatDateTime(e.occurred_at)}>{timeAgo(e.occurred_at)}{e.actor ? ` · ${e.actor}` : ''}</p></div>
              </AppStaggerItem>
            ))}
          </AppStagger>
        )}
      </Panel>
      <RaiseExceptionDialog open={raise} onOpenChange={setRaise} shipment={{ id: data.shipment.id, number: data.shipment.number }} onRaised={load} />
    </div>
  )
}
