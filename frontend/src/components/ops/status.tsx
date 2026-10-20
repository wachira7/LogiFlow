// src/components/ops/status.tsx
// How exceptions, vehicles and shipment events look across the ops pages.
import {
  AlertTriangle, Camera, CheckCircle2, CircleDot, Flag, MapPin, MessageSquare, PackageCheck, PackagePlus, ShieldCheck, Truck, UserCog, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { StatusPill, toneChip, type Tone } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import type { ExceptionStatus, ExceptionType, Severity, VehicleStatus, VehicleType } from '@/services/opsService'

export const SEVERITY: Record<Severity, { label: string; tone: Tone; rank: number }> = {
  CRITICAL: { label: 'Critical', tone: 'danger', rank: 0 },
  HIGH: { label: 'High', tone: 'warning', rank: 1 },
  MEDIUM: { label: 'Medium', tone: 'info', rank: 2 },
  LOW: { label: 'Low', tone: 'neutral', rank: 3 },
}

export const EXCEPTION_STATUS: Record<ExceptionStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Open', tone: 'danger' },
  ACKNOWLEDGED: { label: 'In hand', tone: 'warning' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  DISMISSED: { label: 'Dismissed', tone: 'neutral' },
}

export const EXCEPTION_TYPES: [ExceptionType, string][] = [
  ['DELAY', 'Delay'], ['FAILED_DELIVERY', 'Failed delivery'], ['CUSTOMER_UNAVAILABLE', 'Customer unavailable'], ['ADDRESS_ISSUE', 'Address issue'],
  ['DAMAGED', 'Damaged goods'], ['LOST', 'Lost goods'], ['VEHICLE_BREAKDOWN', 'Vehicle breakdown'], ['TEMPERATURE', 'Temperature out of range'], ['OTHER', 'Other'],
]

export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: 'Available', tone: 'success' },
  IN_USE: { label: 'On a route', tone: 'info' },
  MAINTENANCE: { label: 'Maintenance', tone: 'warning' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
}

export const VEHICLE_TYPES: [VehicleType, string][] = [
  ['MOTORBIKE', 'Motorbike'], ['VAN', 'Van'], ['PICKUP', 'Pickup'], ['TRUCK', 'Truck'], ['REFRIGERATED', 'Refrigerated truck'], ['OTHER', 'Other'],
]

export const SeverityPill = ({ severity }: { severity: Severity }) => (
  <StatusPill tone={SEVERITY[severity].tone} pulse={severity === 'CRITICAL'}>{SEVERITY[severity].label}</StatusPill>
)
export const ExceptionStatusPill = ({ status }: { status: ExceptionStatus }) => (
  <StatusPill tone={EXCEPTION_STATUS[status].tone}>{EXCEPTION_STATUS[status].label}</StatusPill>
)
export const VehiclePill = ({ status }: { status: VehicleStatus }) => (
  <StatusPill tone={VEHICLE_STATUS[status].tone} pulse={status === 'IN_USE'}>{VEHICLE_STATUS[status].label}</StatusPill>
)

const EVENT: Record<string, { icon: LucideIcon; tone: Tone }> = {
  CREATED: { icon: PackagePlus, tone: 'brand' },
  STATUS_CHANGED: { icon: CircleDot, tone: 'info' },
  ASSIGNED: { icon: UserCog, tone: 'neutral' },
  STOP_ARRIVED: { icon: MapPin, tone: 'info' },
  STOP_COMPLETED: { icon: CheckCircle2, tone: 'success' },
  STOP_FAILED: { icon: XCircle, tone: 'danger' },
  EXCEPTION_RAISED: { icon: AlertTriangle, tone: 'warning' },
  EXCEPTION_RESOLVED: { icon: ShieldCheck, tone: 'success' },
  PROOF_OF_DELIVERY: { icon: Camera, tone: 'success' },
  NOTE: { icon: MessageSquare, tone: 'neutral' },
}

export function EventIcon({ type, toStatus, className }: { type: string; toStatus?: string; className?: string }) {
  let e = EVENT[type] ?? EVENT.NOTE
  if (type === 'STATUS_CHANGED' && toStatus === 'DELIVERED') e = { icon: PackageCheck, tone: 'success' }
  if (type === 'STATUS_CHANGED' && toStatus === 'SHIPPED') e = { icon: Truck, tone: 'brand' }
  if (type === 'STATUS_CHANGED' && (toStatus === 'CANCELLED' || toStatus === 'RETURNED')) e = { icon: Flag, tone: 'neutral' }
  return <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-card', toneChip[e.tone], className)}><e.icon className="h-4 w-4" /></span>
}

/** "12 min", "3 h", "2 d" — how long something has been open. */
export function age(minutes: number) {
  if (minutes < 60) return `${Math.max(minutes, 0)} min`
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} h`
  return `${Math.round(minutes / 1440)} d`
}

/** Minutes since a timestamp. */
export const minutesSince = (iso?: string | null) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 60000) : null)
