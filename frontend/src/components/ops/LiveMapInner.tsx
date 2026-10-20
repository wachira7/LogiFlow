// src/components/ops/LiveMapInner.tsx (browser only; loaded through LiveMap)
'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { MapMarker, MapStop } from './LiveMap'

const STOP_COLORS: Record<string, string> = { PENDING: '#64748b', ARRIVED: '#2563eb', COMPLETED: '#0e7c86', FAILED: '#dc2626' }

function unitIcon(m: MapMarker) {
  const color = m.stale ? '#94a3b8' : m.tone === 'warning' ? '#d97706' : '#0e7c86'
  const rotate = m.heading != null && !m.stale ? `transform:rotate(${m.heading}deg);` : ''
  const truck = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
  const pulse = m.stale ? '' : `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:.25;animation:lf-ping 1.8s cubic-bezier(0,0,.2,1) infinite"></span>`
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span style="position:relative;display:block;width:34px;height:34px">${pulse}<span style="position:relative;display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:9999px;background:${color};color:white;box-shadow:0 4px 14px rgba(0,0,0,.3);border:2px solid white;font:700 11px Inter,sans-serif">${m.glyph === 'truck' ? truck : m.heading != null && !m.stale ? `<svg width="14" height="14" viewBox="0 0 24 24" style="${rotate}" fill="white"><path d="M12 2l7 19-7-4-7 4z"/></svg>` : m.label.slice(0, 2).toUpperCase()}</span></span>`,
  })
}

const stopIcon = (n: number, status: string) => L.divIcon({
  className: '', iconSize: [26, 26], iconAnchor: [13, 13],
  html: `<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:9999px;background:${STOP_COLORS[status] ?? '#0e7c86'};color:white;font:600 11px Inter,sans-serif;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)">${n}</span>`,
})

function Fit({ points, focus }: { points: [number, number][]; focus?: [number, number] | null }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (focus) { map.flyTo(focus, Math.max(map.getZoom(), 14), { duration: 0.8 }); return }
    if (fitted.current || !points.length) return
    fitted.current = true  // fit once; later updates (live positions) shouldn't keep jumping the view
    if (points.length === 1) map.setView(points[0], 13)
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
  }, [map, points, focus])
  return null
}

export default function LiveMapInner({ markers, stops = [], trail = [], focus, onSelect }: {
  markers: MapMarker[]; stops?: MapStop[]; trail?: [number, number][]; focus?: [number, number] | null; onSelect?: (id: string) => void
}) {
  const points = useMemo(() => [
    ...markers.map((m) => [m.latitude, m.longitude] as [number, number]),
    ...stops.filter((s) => s.latitude != null).map((s) => [s.latitude!, s.longitude!] as [number, number]),
    ...trail,
  ], [markers, stops, trail])
  return (
    <MapContainer center={points[0] ?? [-1.286389, 36.817223]} zoom={11} scrollWheelZoom className="h-full w-full rounded-xl">
      <style>{'@keyframes lf-ping{75%,100%{transform:scale(2);opacity:0}}@media (prefers-reduced-motion:reduce){[style*="lf-ping"]{animation:none!important}}'}</style>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#0e7c86', weight: 4, opacity: 0.6 }} />}
      {trail.length > 0 && <CircleMarker center={trail[0]} radius={5} pathOptions={{ color: '#0e7c86', fillOpacity: 1 }}><Tooltip>Start</Tooltip></CircleMarker>}
      {stops.filter((s) => s.latitude != null).map((s) => (
        <Marker key={s.id} position={[s.latitude!, s.longitude!]} icon={stopIcon(s.number, s.status)}>
          <Popup><strong>Stop {s.number}</strong><br />{s.label}</Popup>
        </Marker>
      ))}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.latitude, m.longitude]} icon={unitIcon(m)} eventHandlers={{ click: () => onSelect?.(m.id) }}>
          <Tooltip direction="top" offset={[0, -16]}>{m.label}{m.sub ? ` · ${m.sub}` : ''}</Tooltip>
        </Marker>
      ))}
      <Fit points={points} focus={focus} />
    </MapContainer>
  )
}
