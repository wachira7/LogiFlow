// src/components/landing/Pricing.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "./motion";
import { SectionHeader } from "./shared";

// Mirrors backend/scripts/create_subscription_plans.py (monthly price; annual = 20% off)
const ANNUAL_DISCOUNT = 0.2;
const plans = [
  {
    name: "Starter",
    price: 69,
    description: "For small teams getting their stock and orders under control.",
    limits: ["Up to 5 users", "2 warehouses", "1,000 products"],
    features: ["Basic inventory management", "Order processing", "API access", "Email support"],
    muted: ["Limited reporting", "Basic integrations only"],
  },
  {
    name: "Professional",
    price: 159,
    popular: true,
    description: "For growing operations running production, warehouses and delivery.",
    limits: ["Up to 25 users", "5 warehouses", "10,000 products"],
    features: [
      "Full inventory management",
      "Distribution & routing",
      "Production planning",
      "Real-time analytics & advanced reporting",
      "M-Pesa, card & crypto billing",
      "Custom integrations",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: 269,
    description: "For large or multi-company operations that need more control.",
    limits: ["Unlimited users", "Unlimited warehouses", "Unlimited products"],
    features: [
      "Everything in Professional",
      "Advanced audit logging",
      "Multi-company management",
      "Dedicated account manager",
      "SLA & 24/7 phone support",
      "White-label & custom development",
    ],
  },
];

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function Pricing() {
  const { isAuthenticated } = useAuth();
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans that grow with you"
          description="Every plan starts with a 14-day free trial. Prices in USD; M-Pesa payments are charged in KES at the current rate."
        />

        {/* billing toggle */}
        <div className="mt-10 flex justify-center">
          <div role="radiogroup" aria-label="Billing period" className="relative inline-flex rounded-full border border-border bg-background p-1">
            {[
              { value: false, label: "Monthly" },
              { value: true, label: "Annual" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={annual === opt.value}
                onClick={() => setAnnual(opt.value)}
                className={cn(
                  "relative z-10 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  annual === opt.value ? "text-brand-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {annual === opt.value && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                {opt.label}
                {opt.value && (
                  <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", annual ? "bg-white/20" : "bg-success-soft text-success")}>
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Stagger className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const monthly = annual ? plan.price * (1 - ANNUAL_DISCOUNT) : plan.price;
            const isEnterprise = plan.name === "Enterprise";
            return (
              <StaggerItem key={plan.name} className="h-full">
                <div
                  className={cn(
                    "card-lift relative flex h-full flex-col rounded-2xl border bg-card p-8",
                    plan.popular ? "border-brand shadow-xl shadow-brand/15 lg:-my-4 lg:py-12" : "border-border",
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground shadow-lg shadow-brand/30">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 min-h-[48px] text-sm text-muted-foreground">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <div className="relative h-12 overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={monthly}
                          initial={{ y: 30, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -30, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="block text-5xl font-semibold tracking-tight tabular-nums"
                        >
                          {money(monthly)}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 h-5 text-xs text-muted-foreground">
                    {annual ? `${money(plan.price * 12 * (1 - ANNUAL_DISCOUNT))} billed yearly` : "Billed monthly"}
                  </p>

                  <Button
                    asChild
                    size="lg"
                    className={cn(
                      "group mt-6 w-full",
                      plan.popular ? "btn-shine bg-brand text-brand-foreground hover:bg-brand/90" : "",
                    )}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {isEnterprise ? (
                      <a href="#contact">
                        Talk to sales <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    ) : (
                      <Link href={isAuthenticated ? "/billing/plans" : "/auth/register"}>
                        {isAuthenticated ? "Choose plan" : "Start free trial"}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    )}
                  </Button>

                  <div className="mt-8 border-t border-border pt-6">
                    <ul className="space-y-1.5 text-sm font-medium">
                      {plan.limits.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                    <ul className="mt-5 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          {f}
                        </li>
                      ))}
                      {plan.muted?.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="mt-2 h-px w-4 shrink-0 bg-muted-foreground/50" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
