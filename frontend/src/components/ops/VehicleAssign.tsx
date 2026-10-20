// src/components/ops/VehicleAssign.tsx
'use client'

import { useEffect, useState } from 'react'
import { opsService, type Vehicle } from '@/services/opsService'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VEHICLE_STATUS } from './status'

/** Pick a fleet vehicle; vehicles in maintenance or inactive can't be chosen (unless already assigned). */
export function VehicleAssign({ value, onChange, label = 'Vehicle', id = 'vehicle-assign' }: {
  value: string | null; onChange: (id: string | null) => void; label?: string; id?: string
}) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  useEffect(() => { opsService.vehicles().then(setVehicles).catch(() => setVehicles([])) }, [])
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)} disabled={!vehicles}>
        <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Loading…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No vehicle</SelectItem>
          {(vehicles ?? []).map((v) => (
            <SelectItem key={v.id} value={v.id} disabled={['MAINTENANCE', 'INACTIVE'].includes(v.status) && v.id !== value}>
              {v.registration}{v.name ? ` · ${v.name}` : ''} <span className="text-muted-foreground">({VEHICLE_STATUS[v.status].label.toLowerCase()})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {vehicles && vehicles.length === 0 && <p className="text-xs text-muted-foreground">Add vehicles under Operations → Fleet.</p>}
    </div>
  )
}
