// src/components/landing/Features.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, BarChart3, Boxes, Check, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, viewport } from "./motion";
import { SectionHeader } from "./shared";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── mini visuals ─────────────────────────────────────────────── */

function AlertsVisual() {
  const alerts = [
    { tone: "bg-danger", label: "3 shipments past their ETA", sub: "1 by more than 24 hours", tag: "Critical", tagClass: "bg-danger-soft text-danger" },
    { tone: "bg-warning", label: "7 stock lines at reorder point", sub: "Nairobi DC, Mombasa hub", tag: "Warning", tagClass: "bg-warning-soft text-warning" },
    { tone: "bg-warning", label: "2 orders waiting over 2 days", sub: "Not yet processed", tag: "Warning", tagClass: "bg-warning-soft text-warning" },
  ];
  return (
    <div className="space-y-2.5">
      {alerts.map((a, i) => (
        <motion.div
          key={a.label}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewport}
          transition={{ duration: 0.6, ease, delay: 0.15 + i * 0.12 }}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", a.tone)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{a.label}</div>
            <div className="truncate text-xs text-muted-foreground">{a.sub}</div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", a.tagClass)}>{a.tag}</span>
        </motion.div>
      ))}
    </div>
  );
}

function StockVisual() {
  const rows = [
    { name: "Nairobi DC", available: 72, reserved: 18 },
    { name: "Mombasa hub", available: 46, reserved: 30 },
    { name: "Kisumu depot", available: 21, reserved: 9, low: true },
  ];
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Maize flour 2kg · SKU MF-2</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" />Available</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-info/60" />Reserved</span>
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={r.name}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span>{r.name}</span>
            <span className={cn("tabular-nums text-xs", r.low ? "font-medium text-warning" : "text-muted-foreground")}>
              {r.available} available{r.low ? " · reorder" : ""}
            </span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full", r.low ? "bg-warning" : "bg-brand")}
              initial={{ width: 0 }}
              whileInView={{ width: `${r.available}%` }}
              viewport={viewport}
              transition={{ duration: 1, ease, delay: 0.2 + i * 0.12 }}
            />
            <motion.div
              className="h-full bg-info/60"
              initial={{ width: 0 }}
              whileInView={{ width: `${r.reserved}%` }}
              viewport={viewport}
              transition={{ duration: 1, ease, delay: 0.5 + i * 0.12 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RouteVisual() {
  const stops = [
    { name: "Nairobi DC", note: "Departed 08:10", done: true },
    { name: "Westlands · 3 parcels", note: "Arrived 08:42 · completed", done: true },
    { name: "Kilimani · 1 parcel", note: "Arrived 09:15", done: true },
    { name: "Karen · 2 parcels", note: "ETA 09:50", done: false },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-medium">Route · Nairobi West</span>
        <span className="text-muted-foreground">KBX 902L</span>
      </div>
      <ol className="relative space-y-4 pl-7">
        <span className="absolute bottom-2 left-[9px] top-2 w-0.5 bg-border" aria-hidden="true" />
        {stops.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.5, ease, delay: 0.2 + i * 0.18 }}
            className="relative"
          >
            <span
              className={cn(
                "absolute -left-7 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                s.done ? "border-brand bg-brand text-brand-foreground" : "border-brand bg-background",
              )}
            >
              {s.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />}
            </span>
            <div className="text-sm font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.note}</div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function AnalyticsVisual() {
  const reduce = useReducedMotion();
  const bars = [52, 61, 58, 70, 66, 78, 84];
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Orders delivered · last 7 weeks</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">+62%</div>
        </div>
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">On-time 96.4%</span>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className={cn("flex-1 rounded-t-md", i === bars.length - 1 ? "bg-brand" : "bg-brand/30")}
            initial={reduce ? false : { height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={viewport}
            transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.07 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── rows ─────────────────────────────────────────────────────── */

const rows = [
  {
    icon: AlertTriangle,
    eyebrow: "Exceptions first",
    title: "Problems find you, not the other way round",
    body: "Delayed shipments, stock at its reorder point and orders left waiting are flagged on your overview automatically, ranked by severity, so the day starts with what matters.",
    points: ["Delay, low-stock and waiting-order alerts", "On-time rate and delivery-time trends", "Every figure shows when it was last updated"],
    visual: <AlertsVisual />,
  },
  {
    icon: Boxes,
    eyebrow: "Inventory & warehousing",
    title: "Stock you can trust, in every location",
    body: "See quantities per product and warehouse, set reorder points, move stock between sites with approved transfers, and keep a full history of every adjustment.",
    points: ["Multi-warehouse stock levels and bin locations", "Transfers with approval and movement history", "Production orders that feed finished goods into stock"],
    visual: <StockVisual />,
  },
  {
    icon: Route,
    eyebrow: "Dispatch & delivery",
    title: "From order to doorstep, stop by stop",
    body: "Turn orders into shipments, build delivery routes, assign drivers and follow each stop from arrival to completion. Addresses are mapped automatically.",
    points: ["Order → shipment → route in a few clicks", "Arrive, complete or fail each stop with notes", "Proof of delivery and a driver app"],
    soon: "Proof of delivery and a driver app",
    visual: <RouteVisual />,
  },
  {
    icon: BarChart3,
    eyebrow: "Analytics",
    title: "Numbers your whole team can read",
    body: "Production, warehousing, inventory and distribution reports in one place, so managers see trends and costs without exporting spreadsheets.",
    points: ["Module dashboards and reports", "Delivery performance over time", "Company-wide view across all sites"],
    visual: <AnalyticsVisual />,
  },
];

export function Features() {
  return (
    <section id="product" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="The platform"
          title="Everything your operation runs on, in one place"
          description="Built around the work, not the data: each screen tells you what is happening and what to do about it."
        />
        <div className="mt-20 space-y-24">
          {rows.map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={row.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <Reveal className={cn(i % 2 === 1 && "lg:order-2")}>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
                      <Icon className="h-4 w-4" />
                    </span>
                    {row.eyebrow}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{row.title}</h3>
                  <p className="mt-4 text-muted-foreground">{row.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {row.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>
                          {p}
                          {row.soon === p && (
                            <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info">
                              Coming soon
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={0.1} className={cn("relative", i % 2 === 1 && "lg:order-1")}>
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-brand-soft to-transparent opacity-80" />
                  {row.visual}
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
