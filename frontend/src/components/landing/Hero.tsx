// src/components/landing/Hero.tsx
// Entrance uses CSS animation so the hero is visible before JavaScript loads.
import { ScrollFade } from "./motion";
import { ProductPreview } from "./ProductPreview";
import { CtaButtons } from "./shared";

export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* drifting brand glow + fading grid */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] animate-float-slow rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(60%_60%_at_70%_30%,black,transparent)]" />

      <ScrollFade className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-20">
        <div>
          <div className="animate-fade-up" style={{ animationDelay: "0s" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Built in Africa, for logistics teams everywhere
            </span>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.08s" }}>
            <h1 id="hero-title" className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              See what&apos;s moving, what&apos;s late, and{" "}
              <span className="bg-gradient-to-r from-brand to-info bg-clip-text text-transparent">what to do next.</span>
            </h1>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.16s" }}>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              LogiFlow brings production, warehouses, inventory, dispatch and billing into one workspace, so your team
              spots problems early and fixes them in a click. Pay with M-Pesa, card or crypto.
            </p>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
            <CtaButtons className="mt-8" />
            <p className="mt-4 text-sm text-muted-foreground">
              14-day free trial on every plan.{" "}
              <span className="hidden lg:inline">Try resolving an issue in the preview →</span>
            </p>
          </div>
        </div>
        <ProductPreview />
      </ScrollFade>
    </section>
  );
}
