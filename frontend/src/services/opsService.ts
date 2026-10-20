// src/services/opsService.ts
// Operations API: search, board, activity, exceptions, fleet, pings, proof of delivery, driver day, public tracking.
import { api } from './api'

const B = '/api/v1/ops'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
export type ExceptionType = 'DELAY' | 'FAILED_DELIVERY' | 'CUSTOMER_UNAVAILABLE' | 'ADDRESS_ISSUE' | 'DAMAGED' | 'LOST' | 'VEHICLE_BREAKDOWN' | 'TEMPERATURE' | 'OTHER'
export type VehicleType = 'MOTORBIKE' | 'VAN' | 'PICKUP' | 'TRUCK' | 'REFRIGERATED' | 'OTHER'
export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE'

export interface SearchItem { id: string; title: string; subtitle: string; status: string | null; href: string }
export interface SearchGroup { key: string; label: string; items: SearchItem[] }

export interface OpsEvent {
  id: string; type: string; message: string; from_status: string; to_status: string; actor: string | null; occurred_at: string
  shipment: { id: string; number: string }
}

export interface Position { latitude: number; longitude: number; speed_kmh?: number | null; heading?: number | null; accuracy_m?: number | null; recorded_at: string; live: boolean }

export interface RouteProgress {
  id: string; name: string; status: string; done: number; total: number
  next_stop: { id: string; number: number; address: string; status: string; latitude: number | null; longitude: number | null } | null
}

export interface BoardCard {
  id: string; number: string; status: string; customer: string; destination: string; driver: string | null; vehicle: string | null
  estimated_delivery: string | null; actual_delivery: string | null; is_delayed: boolean; open_exceptions: number; updated_at: string
  route: { id: string; name: string; stop: number } | null
}

export interface OpsException {
  id: string; exception_type: ExceptionType; type_label: string; severity: Severity; status: ExceptionStatus; title: string
  description: string; cause: string; impact: string; recommended_action: string
  shipment_id: string | null; shipment_number: string | null; route_id: string | null; route_name: string | null; route_stop_id: string | null
  owner_id: string | null; owner_name: string | null; reported_by_name: string | null; resolved_by_name: string | null
  resolved_at: string | null; resolution_notes: string; age_minutes: number; created_at: string; updated_at: string
}

export interface Board {
  generated_at: string
  summary: { in_flight: number; late: number; delivered_today: number; on_time_today: number | null; open_exceptions: number; critical_exceptions: number; routes_running: number }
  columns: { key: string; label: string; count: number; cards: BoardCard[] }[]
  routes: (RouteProgress & { driver: string | null; vehicle: string | null; started_at: string | null; last_position: Position | null })[]
  exceptions: OpsException[]
}

export interface Vehicle {
  id: string; registration: string; name: string; vehicle_type: VehicleType; type_label: string; status: VehicleStatus; status_label: string
  capacity_kg: string | null; capacity_m3: string | null; default_driver_id: string | null; default_driver_name: string | null; notes: string
  created_at: string; updated_at: string
}

export interface FleetLive {
  generated_at: string
  vehicles: { id: string; registration: string; name: string; type: VehicleType; type_label: string; status: VehicleStatus
    driver: { id: string; name: string } | null; route: RouteProgress | null; last_ping: Position | null }[]
  drivers: { id: string; name: string; phone: string; route: RouteProgress | null; last_ping: Position | null }[]
}

export interface Proof {
  id: string; recipient_name: string; signature_url: string | null; photo_url: string | null; latitude: number | null; longitude: number | null
  notes: string; captured_by: string | null; captured_at: string; stop_id: string | null
}

export interface Timeline {
  shipment: { id: string; number: string; status: string; public_token: string }
  events: OpsEvent[]; proofs: Proof[]; exceptions: OpsException[]
}

export interface RouteTrail {
  route: RouteProgress; driver: string | null; vehicle: string | null; last_position: { latitude: number; longitude: number; recorded_at: string } | null
  trail: { latitude: number; longitude: number; recorded_at: string }[]
  stops: { id: string; number: number; address: string; status: string; latitude: number | null; longitude: number | null; shipment_number: string; actual_arrival: string | null }[]
}

export interface DriverStop {
  id: string; number: number; status: 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'FAILED'; address: string; notes: string
  latitude: number | null; longitude: number | null; actual_arrival: string | null; departure_time: string | null
  shipment: { id: string; number: string; status: string; recipient: string; phone: string; items: number; notes: string; has_proof: boolean }
}

export interface DriverDay {
  route: (RouteProgress & { vehicle: string | null; start_location: string; notes: string; started_at: string | null }) | null
  stops: DriverStop[]; upcoming: number
}

export interface PublicTracking {
  shipment_number: string; status: string; status_label: string; steps: { key: string; label: string; done: boolean }[]
  carrier: string; tracking_number: string; estimated_delivery: string | null; actual_delivery: string | null; is_delayed: boolean
  destination_area: string; recipient_first_name: string
  company: { name: string; logo_url: string | null; phone: string }
  live: { latitude: number; longitude: number; recorded_at: string; stops_before_you: number; eta_minutes: number | null; arrived: boolean } | null
  proof: { recipient_name: string; captured_at: string } | null
  events: { type: string; message: string; occurred_at: string }[]
}

export interface PingInput { latitude: number; longitude: number; accuracy_m?: number | null; speed_kmh?: number | null; heading?: number | null; recorded_at?: string }

function unwrap<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success) throw new Error(res.error || 'Something went wrong. Please try again.')
  return res.data as T
}
const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []))
type Filters = Record<string, string | undefined>
const clean = (f: Filters = {}) => Object.fromEntries(Object.entries({ page_size: '100', ...f }).filter(([, v]) => v))

export const opsService = {
  search: async (q: string) => unwrap(await api.get<{ query: string; groups: SearchGroup[] }>(`${B}/search/`, { q })),
  board: async () => unwrap(await api.get<Board>(`${B}/board/`)),
  activity: async (f?: Filters) => unwrap(await api.get<{ results: OpsEvent[]; has_more: boolean }>(`${B}/activity/`, clean(f))),
  timeline: async (shipmentId: string) => unwrap(await api.get<Timeline>(`${B}/shipments/${shipmentId}/timeline/`)),
  trail: async (routeId: string) => unwrap(await api.get<RouteTrail>(`${B}/routes/${routeId}/trail/`)),

  exceptions: async (f?: Filters) => list<OpsException>(unwrap(await api.get(`${B}/exceptions/`, clean(f)))),
  exceptionSummary: async () => unwrap(await api.get<{ open: number; unassigned: number; by_severity: Partial<Record<Severity, number>>; by_type: Record<string, number>; resolved_7d: number; median_minutes_to_resolve: number | null }>(`${B}/exceptions/summary/`)),
  createException: async (data: Partial<OpsException>) => unwrap(await api.post<OpsException>(`${B}/exceptions/`, data)),
  updateException: async (id: string, data: Partial<OpsException>) => unwrap(await api.patch<OpsException>(`${B}/exceptions/${id}/`, data)),
  exceptionAction: async (id: string, action: 'acknowledge' | 'resolve' | 'dismiss' | 'reopen', notes = '') =>
    unwrap(await api.post<OpsException>(`${B}/exceptions/${id}/${action}/`, { notes })),

  vehicles: async (f?: Filters) => list<Vehicle>(unwrap(await api.get(`${B}/vehicles/`, clean(f)))),
  createVehicle: async (data: Partial<Vehicle>) => unwrap(await api.post<Vehicle>(`${B}/vehicles/`, data)),
  updateVehicle: async (id: string, data: Partial<Vehicle>) => unwrap(await api.patch<Vehicle>(`${B}/vehicles/${id}/`, data)),
  deleteVehicle: async (id: string) => unwrap(await api.delete(`${B}/vehicles/${id}/`)),
  fleetLive: async () => unwrap(await api.get<FleetLive>(`${B}/fleet/live/`)),

  sendPings: async (pings: PingInput[]) => unwrap(await api.post<{ stored: number; route_id: string | null; vehicle: string | null }>(`${B}/pings/`, { pings })),
  driverToday: async () => unwrap(await api.get<DriverDay>(`${B}/driver/today/`)),
  proofs: async (shipmentId: string) => unwrap(await api.get<Proof[]>(`${B}/shipments/${shipmentId}/proof/`)),
  captureProof: async (shipmentId: string, data: { recipient_name?: string; signature?: string; latitude?: number; longitude?: number; notes?: string; stop_id?: string }, photo?: File | null) => {
    if (!photo) return unwrap(await api.post<Proof>(`${B}/shipments/${shipmentId}/proof/`, data))
    const extra = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== ''))
    return unwrap(await api.upload<Proof>(`${B}/shipments/${shipmentId}/proof/`, photo, 'photo', extra))
  },

  /** No login: plain fetch so a stale session token on this device can't get in the way. */
  publicTrack: async (token: string): Promise<PublicTracking> => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const res = await fetch(`${base}/api/v1/public/track/${encodeURIComponent(token)}/`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || (res.status === 429 ? 'Too many refreshes. Try again in a minute.' : 'We couldn’t load this shipment.'))
    return body as PublicTracking
  },
}
