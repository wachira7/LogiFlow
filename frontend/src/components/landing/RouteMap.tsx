// src/components/landing/RouteMap.tsx
// Illustrative live route map: trucks drive the corridor, routes flow, a delay alert pops up.
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useLiveWhileVisible } from "./motion";

const cities = {
  Mombasa: { x: 520, y: 330 },
  Voi: { x: 440, y: 270 },
  Nairobi: { x: 330, y: 190 },
  Nakuru: { x: 250, y: 140 },
  Kisumu: { x: 120, y: 150 },
  Eldoret: { x: 190, y: 80 },
} as const;
type City = keyof typeof cities;

const path = (...stops: City[]) => stops.map((c, i) => `${i ? "L" : "M"}${cities[c].x} ${cities[c].y}`).join(" ");

const routes = [
  { d: path("Mombasa", "Voi"), color: "var(--danger)" },
  { d: path("Voi", "Nairobi", "Nakuru", "Kisumu"), color: "var(--brand)" },
  { d: path("Nakuru", "Eldoret"), color: "var(--success)" },
];

const trucks = [
  { d: path("Mombasa", "Voi", "Nairobi"), color: "var(--danger)", dur: "14s", label: "KCD 214T" },
  { d: path("Nairobi", "Nakuru", "Kisumu"), color: "var(--brand)", dur: "11s", label: "KBX 902L" },
  { d: path("Nakuru", "Eldoret"), color: "var(--success)", dur: "7s", label: "KDA 118M", bounce: true },
];

export function RouteMap() {
  const [rootRef, live] = useLiveWhileVisible<HTMLDivElement>();
  const [alert, setAlert] = useState(false);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setAlert((a) => !a), 3500);
    return () => clearInterval(t);
  }, [live]);

  return (
    <div ref={rootRef} className="relative h-full w-full">
      <svg viewBox="0 0 600 400" className="h-full w-full" role="img" aria-label="Illustrative map of trucks moving between Mombasa, Nairobi, Nakuru, Kisumu and Eldoret">
        <defs>
          <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="white" strokeOpacity="0.06" />
          </pattern>
          <radialGradient id="map-glow" cx="55%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="400" fill="url(#map-grid)" />
        <rect width="600" height="400" fill="url(#map-glow)" />

        {routes.map((r) => (
          <g key={r.d}>
            <path d={r.d} fill="none" stroke={r.color} strokeOpacity="0.18" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={r.d}
              fill="none"
              stroke={r.color}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-dash-flow"
            />
          </g>
        ))}

        {(Object.keys(cities) as City[]).map((name) => {
          const c = cities[name];
          return (
            <g key={name}>
              <circle cx={c.x} cy={c.y} r="8" fill="var(--brand)" className="animate-pulse-ring" />
              <circle cx={c.x} cy={c.y} r="4.5" fill="white" />
              <text x={c.x + 12} y={c.y + 4} fill="white" fillOpacity="0.75" fontSize="12">
                {name}
              </text>
            </g>
          );
        })}

        {live && trucks.map((t) => (
          <g key={t.label}>
            {/* halo + truck dot, moved along the route */}
            <g>
              <circle r="11" fill={t.color} fillOpacity="0.25" />
              <circle r="6" fill={t.color} stroke="white" strokeWidth="2" />
              {(
                <animateMotion
                  dur={t.dur}
                  repeatCount="indefinite"
                  path={t.d}
                  {...(t.bounce ? { keyPoints: "0;1;0", keyTimes: "0;0.5;1", calcMode: "linear" } : {})}
                />
              )}
            </g>
          </g>
        ))}
        {/* static positions while paused (off-screen or reduced motion) */}
        {!live &&
          [
            { x: 480, y: 300, c: "var(--danger)" },
            { x: 290, y: 165, c: "var(--brand)" },
            { x: 220, y: 110, c: "var(--success)" },
          ].map((p) => <circle key={p.x} cx={p.x} cy={p.y} r="6" fill={p.c} stroke="white" strokeWidth="2" />)}
      </svg>

      <AnimatePresence>
        {(alert || !live) && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="absolute right-3 top-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[oklch(0.22_0.04_260)]/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--danger)]" />
            <span>
              <strong className="font-semibold">KCD 214T</strong> is running 25 min late
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Live counters under the map: values drift like a real feed. */
export function LiveCounters({ className }: { className?: string }) {
  const [rootRef, live] = useLiveWhileVisible<HTMLDivElement>();
  const [inTransit, setInTransit] = useState(42);
  const [onTime, setOnTime] = useState(96.2);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setInTransit((n) => Math.max(38, Math.min(48, n + (Math.random() < 0.5 ? -1 : 1))));
      setOnTime((v) => Math.max(95, Math.min(97.5, +(v + (Math.random() - 0.5) * 0.4).toFixed(1))));
    }, 2200);
    return () => clearInterval(t);
  }, [live]);

  const items = [
    { l: "In transit", v: String(inTransit), c: "text-white" },
    { l: "On time", v: `${onTime.toFixed(1)}%`, c: "text-[var(--success)]" },
    { l: "Delayed", v: "3", c: "text-[var(--danger)]" },
  ];
  return (
    <div ref={rootRef} className={className}>
      {items.map((k) => (
        <div key={k.l} className="rounded-lg border border-white/10 bg-[oklch(0.22_0.04_260)] p-3 shadow-xl">
          <div className="text-[11px] text-white/60">{k.l}</div>
          {/* clipped slot: old value slides out as the new one slides in */}
          <div className="relative h-7 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.div
                key={k.v}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute inset-x-0 text-xl font-semibold tabular-nums ${k.c}`}
              >
                {k.v}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
