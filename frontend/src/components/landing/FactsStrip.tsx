// src/components/landing/FactsStrip.tsx
import { Banknote, Building2, Clock3, Globe2, ShieldCheck, Smartphone } from "lucide-react";

// Only things the product does today
const facts = [
  { icon: Smartphone, label: "M-Pesa billing" },
  { icon: Banknote, label: "Card & crypto payments" },
  { icon: Globe2, label: "Multi-currency pricing" },
  { icon: Building2, label: "Multi-company workspaces" },
  { icon: ShieldCheck, label: "Role-based access" },
  { icon: Clock3, label: "14-day free trial" },
];

export function FactsStrip() {
  return (
    <section aria-label="Platform highlights" className="border-y border-border bg-muted/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 lg:px-8">
        {facts.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="animate-fade-up flex items-center gap-2.5 text-sm font-medium text-muted-foreground"
            style={{ animationDelay: `${0.35 + i * 0.06}s` }}
          >
            <Icon className="h-4 w-4 shrink-0 text-brand" />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
