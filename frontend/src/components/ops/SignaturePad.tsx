// src/components/ops/SignaturePad.tsx
// Finger or mouse signature on a canvas; reports a PNG data URL (or null when cleared).
'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SignaturePad({ onChange, className = 'h-40' }: { onChange: (dataUrl: string | null) => void; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const drawn = useRef(false)
  const [empty, setEmpty] = useState(true)

  // Match the canvas to its displayed size (and the screen's pixel density) so lines stay crisp
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = c.getBoundingClientRect()
      c.width = width * ratio
      c.height = height * ratio
      const ctx = c.getContext('2d')!
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'
      drawn.current = false
      setEmpty(true)
      onChange(null)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [onChange])

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const ctx = canvas.current!.getContext('2d')!
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!drawn.current) { drawn.current = true; setEmpty(false) }
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    if (drawn.current) onChange(canvas.current!.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvas.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    drawn.current = false
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed bg-white ${className}`}>
        <canvas ref={canvas} className="h-full w-full touch-none" aria-label="Signature pad: sign with your finger or mouse"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} onPointerCancel={end} />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Sign here</span>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-300" />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={empty}><Eraser className="mr-1.5 h-3.5 w-3.5" />Clear</Button>
    </div>
  )
}
