// src/components/landing/ProductPreview.tsx
// Illustrative, code-built product preview (not a screenshot) that behaves like the live app:
// issues arrive in the queue, can be resolved, shipment statuses advance, freshness ticks.
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp, useLiveWhileVisible } from "./motion";

type Tone = "danger" | "warning" | "info" | "success";

const toneBadge: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
};
const toneDot: Record<Tone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
};

const issuePool: { tone: Tone; title: string; meta: string }[] = [
  { tone: "danger", title: "KCD 214T running 25 min late", meta: "Mombasa Rd · ETA 14:40 · 6 drops left" },
  { tone: "warning", title: "Maize flour 2kg below reorder point", meta: "Nairobi DC · 18 left · reorder 40" },
  { tone: "info", title: "Order #4821 waiting 2 days", meta: "Kisumu · not yet picked" },
  { tone: "danger", title: "Delivery failed at stop 4", meta: "Westlands · customer unreachable" },
  { tone: "warning", title: "Cold-chain van at 9°C", meta: "KBZ 771Q · limit 8°C" },
  { tone: "info", title: "Transfer TR-118 awaiting approval", meta: "Thika → Nairobi · 240 units" },
];

const statusFlow: { status: string; tone: Tone }[] = [
  { status: "Packed", tone: "warning" },
  { status: "In transit", tone: "info" },
  { status: "Delivered", tone: "success" },
];

const initialShipments = [
  { id: "SH-1042", route: "Nairobi → Nakuru", step: 1 },
  { id: "SH-1041", route: "Mombasa → Voi", step: -1 }, // -1 = delayed
  { id: "SH-1039", route: "Thika → Nairobi", step: 2 },
  { id: "SH-1038", route: "Eldoret → Kitale", step: 0 },
];

const newRoutes = ["Nairobi → Machakos", "Nakuru → Naivasha", "Mombasa → Malindi", "Kisumu → Kakamega", "Nyeri → Nanyuki"];
let shipmentSeq = 1042;
let issueSeq = 0;
const nextIssue = (offset: number) => ({ ...issuePool[offset % issuePool.length], key: ++issueSeq });

export function ProductPreview({ className, interactive = true }: { className?: string; interactive?: boolean }) {
  const reduce = useReducedMotion();
  const [issues, setIssues] = useState(() => [nextIssue(0), nextIssue(1), nextIssue(2)]);
  const [resolved, setResolved] = useState(0);
  const [shipments, setShipments] = useState(initialShipments);
  const [seconds, setSeconds] = useState(12);
  const [active, setActive] = useState(128);
  const poolIndex = useRef(3);
  const [rootRef, live] = useLiveWhileVisible<HTMLDivElement>();

  // Freshness ticks every second and "refreshes" every 15s
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeconds((s) => (s >= 15 ? 0 : s + 1)), 1000);
    return () => clearInterval(t);
  }, [live]);

  // A new issue arrives every few seconds (queue keeps the 3 most recent)
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setIssues((list) => [nextIssue(poolIndex.current++), ...list].slice(0, 3));
    }, 4200);
    return () => clearInterval(t);
  }, [live]);

  // Shipments advance through their statuses; a new one is dispatched now and then
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setShipments((list) =>
        list.map((s) => {
          if (s.step === 2 && Math.random() < 0.35) {
            // delivered: replace with a newly dispatched shipment
            const n = ++shipmentSeq;
            return { id: `SH-${n}`, route: newRoutes[n % newRoutes.length], step: 0 };
          }
          return s.step >= 0 && s.step < 2 && Math.random() < 0.45 ? { ...s, step: s.step + 1 } : s;
        }),
      );
      setActive((n) => n + (Math.random() < 0.5 ? 1 : 0));
    }, 3000);
    return () => clearInterval(t);
  }, [live]);

  const resolve = (key: number) => {
    setIssues((list) => list.filter((i) => i.key !== key));
    setResolved((n) => n + 1);
  };

  // Subtle 3D tilt that follows the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 150, damping: 18 });
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || !interactive) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div ref={rootRef} className={cn("[perspective:1400px]", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div
        style={{ rotateX, rotateY, animationDelay: "0.25s" }}
        className="animate-fade-up overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl shadow-primary/15 will-change-transform"
        aria-label="Illustrative preview of the LogiFlow overview screen"
        role="img"
      >
        {/* window bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Overview · Nairobi region</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {seconds === 0 ? "Just updated" : `Updated ${seconds}s ago`}
          </span>
        </div>

        <div className="space-y-4 p-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Active shipments" note={`+${active - 116} today`}>
              <motion.span key={active} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="inline-block tabular-nums">
                {active}
              </motion.span>
            </Kpi>
            <Kpi label="On-time rate" note="last 30 days">
              <CountUp to={96.4} decimals={1} suffix="%" />
            </Kpi>
            <Kpi label="Needs attention" note={`${resolved} resolved`} valueClass="text-danger">
              <motion.span key={issues.length} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="inline-block tabular-nums">
                {issues.length}
              </motion.span>
            </Kpi>
            <Kpi label="Low stock" note="lines" valueClass="text-warning">
              <CountUp to={7} />
            </Kpi>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {/* Needs attention queue */}
            <div className="rounded-lg border border-border sm:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold">Needs attention</span>
                <span className="text-[10px] text-muted-foreground">sorted by impact</span>
              </div>
              <ul className="relative min-h-[156px] divide-y divide-border">
                <AnimatePresence initial={false}>
                  {issues.map((issue) => (
                    <motion.li
                      key={issue.key}
                      layout
                      initial={{ opacity: 0, x: -24, backgroundColor: "var(--brand-soft)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 1.6 } }}
                      className="flex items-start gap-2.5 px-3 py-2.5"
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[issue.tone])} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{issue.title}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{issue.meta}</div>
                      </div>
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => resolve(issue.key)}
                          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium">Resolve</span>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
                {issues.length === 0 && (
                  <motion.li
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center gap-1 py-10 text-center"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium">All clear</span>
                    <span className="text-[10px] text-muted-foreground">New issues appear here first</span>
                  </motion.li>
                )}
              </ul>
            </div>

            {/* Shipments */}
            <div className="rounded-lg border border-border sm:col-span-2">
              <div className="border-b border-border px-3 py-2 text-xs font-semibold">Shipments</div>
              <ul className="divide-y divide-border">
                {shipments.map((s) => {
                  const { status, tone } = s.step === -1 ? { status: "Delayed", tone: "danger" as Tone } : statusFlow[s.step];
                  return (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, x: 16, backgroundColor: "var(--brand-soft)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                      transition={{ duration: 0.45, backgroundColor: { duration: 1.4 } }}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium tabular-nums">{s.id}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{s.route}</div>
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={status}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", toneBadge[tone])}
                        >
                          {status}
                        </motion.span>
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Kpi({
  label,
  note,
  valueClass,
  children,
}: {
  label: string;
  note: string;
  valueClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3 transition-colors hover:border-brand/40">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold", valueClass)}>{children}</div>
      <div className="text-[10px] text-muted-foreground">{note}</div>
    </div>
  );
}
