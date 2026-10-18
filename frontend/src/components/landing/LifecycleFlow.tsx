// src/components/landing/LifecycleFlow.tsx
// Production → delivery flow: a parcel travels the line and each step lights up as it arrives.
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Factory, PackageCheck, Truck, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveWhileVisible } from "./motion";

const steps = [
  { icon: Factory, title: "Produce", detail: "Orders, steps, materials" },
  { icon: Warehouse, title: "Store", detail: "Warehouses, bins, transfers" },
  { icon: Boxes, title: "Stock", detail: "Levels, reorder points" },
  { icon: Truck, title: "Dispatch", detail: "Routes, drivers, stops" },
  { icon: PackageCheck, title: "Deliver", detail: "Tracking, proof, billing" },
];

export function LifecycleFlow() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [rootRef, live] = useLiveWhileVisible<HTMLOListElement>();

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setActive((i) => (i + 1) % steps.length), 1600);
    return () => clearInterval(t);
  }, [live]);

  return (
    <ol ref={rootRef} className="relative grid gap-6 sm:grid-cols-5 sm:gap-4">
      {/* track + progress */}
      <div className="absolute left-[10%] right-[10%] top-8 hidden h-0.5 rounded bg-border sm:block" aria-hidden="true">
        <motion.div
          className="h-full rounded bg-brand"
          animate={{ width: `${(active / (steps.length - 1)) * 100}%` }}
          transition={{ duration: active === 0 ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.span
          className="absolute -top-[7px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background bg-brand shadow-lg shadow-brand/40"
          animate={{ left: `${(active / (steps.length - 1)) * 100}%` }}
          transition={{ duration: active === 0 ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {steps.map(({ icon: Icon, title, detail }, i) => {
        const done = reduce || i <= active;
        return (
          <li
            key={title}
            className="relative flex flex-col items-center text-center"
            onMouseEnter={() => setActive(i)}
          >
            <motion.span
              animate={{ scale: i === active && !reduce ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className={cn(
                "relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-sm transition-colors duration-500",
                done ? "border-brand/50 shadow-brand/20" : "border-border",
              )}
            >
              <Icon className={cn("h-7 w-7 transition-colors duration-500", done ? "text-brand" : "text-muted-foreground")} />
            </motion.span>
            <span className="mt-3 text-xs font-medium text-muted-foreground">0{i + 1}</span>
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted-foreground">{detail}</span>
          </li>
        );
      })}
    </ol>
  );
}
