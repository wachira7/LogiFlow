// src/components/landing/LiveTracking.tsx
import { Clock, MapPin, Smartphone } from "lucide-react";
import { LiveCounters, RouteMap } from "./RouteMap";
import { Reveal, Stagger, StaggerItem } from "./motion";
import { SectionHeader } from "./shared";

const points = [
  { icon: MapPin, title: "Live vehicle positions", body: "Trucks and ETAs on one map, updating as they move." },
  { icon: Clock, title: "Early warnings", body: "“KCD 214T is running 25 min late” before the customer calls." },
  { icon: Smartphone, title: "Shareable tracking links", body: "Customers follow their delivery without an account." },
];

export function LiveTracking() {
  return (
    <section className="relative overflow-hidden bg-[oklch(0.17_0.04_260)] py-24 text-white">
      <div className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] animate-float-slow rounded-full bg-[var(--brand)]/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Reveal>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--info)]" /> In development · coming soon
            </span>
          </Reveal>
          <SectionHeader
            dark
            align="left"
            eyebrow="Live tracking"
            title="Watch your operation move in real time"
            description="Every vehicle and delivery on one live map, with delays flagged the moment they happen."
          />
          <Stagger className="mt-10 space-y-6">
            {points.map(({ icon: Icon, title, body }) => (
              <StaggerItem key={title} className="group flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors group-hover:border-[var(--brand)]/60">
                  <Icon className="h-5 w-5 text-[var(--brand)]" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-white/65">{body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal y={32} className="relative pb-10 lg:col-span-3">
          <div className="aspect-[3/2] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40">
            <RouteMap />
          </div>
          <LiveCounters className="absolute bottom-0 left-4 right-4 grid grid-cols-3 gap-3 sm:left-8 sm:right-auto sm:w-[420px]" />
        </Reveal>
      </div>
    </section>
  );
}
