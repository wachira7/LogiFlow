// src/components/distribution/StopsMapInner.tsx (browser only; loaded through StopsMap)
'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { RouteStop } from '@/types/distribution.types'

const COLORS: Record<string, string> = { PENDING: '#64748b', ARRIVED: '#2563eb', COMPLETED: '#0e7c86', FAILED: '#dc2626' }

const pin = (n: number, status: string) =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9999px;background:${COLORS[status] ?? '#0e7c86'};color:white;font:600 12px Inter,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid white">${n}</span>`,
  })

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 13)
    else if (points.length > 1) map.fitBounds(points, { padding: [32, 32] })
  }, [map, points])
  return null
}

export default function StopsMapInner({ stops }: { stops: RouteStop[] }) {
  const located = stops.filter((s) => s.latitude && s.longitude).sort((a, b) => a.stop_number - b.stop_number)
  const points = located.map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number])
  return (
    <MapContainer center={points[0] ?? [-1.286389, 36.817223]} zoom={11} scrollWheelZoom={false} className="h-full w-full rounded-xl" attributionControl>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: '#0e7c86', weight: 4, opacity: 0.7, dashArray: '8 8' }} />}
      {located.map((s, i) => (
        <Marker key={s.id} position={points[i]} icon={pin(s.stop_number, s.status)}>
          <Popup><strong>Stop {s.stop_number}</strong><br />{s.customer_name ?? s.shipment_number}<br />{s.address}</Popup>
        </Marker>
      ))}
      <Fit points={points} />
    </MapContainer>
  )
}
