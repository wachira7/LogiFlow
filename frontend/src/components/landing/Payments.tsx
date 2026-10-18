// src/components/landing/Payments.tsx
"use client";

import { motion } from "framer-motion";
import { Bitcoin, Building2, CreditCard, Globe2, ShieldCheck, Smartphone } from "lucide-react";
import { Stagger, StaggerItem, viewport } from "./motion";
import { SectionHeader } from "./shared";

const ease = [0.22, 1, 0.36, 1] as const;

const methods = [
  { icon: Smartphone, title: "M-Pesa", body: "Pay your subscription with an STK push straight to your phone, priced in KES." },
  { icon: CreditCard, title: "Card", body: "Visa, Mastercard and more through Stripe, wherever your business is based." },
  { icon: Bitcoin, title: "Crypto", body: "Settle in BTC, ETH, USDT and other currencies via NOWPayments." },
];

const extras = [
  { icon: Globe2, label: "Multi-currency pricing" },
  { icon: Building2, label: "Separate workspace per company" },
  { icon: ShieldCheck, label: "Role-based access for every team" },
];

/** Phone showing an M-Pesa STK prompt that confirms itself. */
function MpesaPhone() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -2 }}
      viewport={viewport}
      transition={{ duration: 0.9, ease }}
      className="relative mx-auto w-64 rounded-[2.2rem] border-[10px] border-[oklch(0.2_0.03_260)] bg-background p-4 shadow-2xl shadow-primary/20"
      aria-hidden="true"
    >
      <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-muted" />
      <div className="rounded-xl border border-border p-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success-soft">
          <Smartphone className="h-5 w-5 text-success" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">M-PESA</div>
        <div className="mt-1 text-sm font-semibold">Pay LogiFlow</div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">KES 8,900</div>
        <div className="text-[11px] text-muted-foreground">Starter plan · monthly</div>
        <div className="mt-4 rounded-md border border-border py-2 text-xs tracking-[0.5em] text-muted-foreground">••••</div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewport}
          transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 18 }}
          className="mt-4 rounded-md bg-success py-2 text-xs font-semibold text-white"
        >
          Payment confirmed ✓
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Payments() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionHeader
            align="left"
            eyebrow="Payments"
            title="Payments that work where you do"
            description="Built in Africa with mobile money at its core, and ready for customers anywhere."
          />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
            {methods.map(({ icon: Icon, title, body }) => (
              <StaggerItem key={title}>
                <div className="card-lift h-full rounded-xl border border-border bg-card p-5">
                  <Icon className="h-5 w-5 text-brand" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {extras.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-brand" /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-10 inset-y-6 -z-10 rounded-full bg-brand/15 blur-3xl" />
          <MpesaPhone />
        </div>
      </div>
    </section>
  );
}
