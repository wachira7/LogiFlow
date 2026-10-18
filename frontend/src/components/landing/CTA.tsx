// src/components/landing/CTA.tsx
import { Reveal } from "./motion";
import { CtaButtons } from "./shared";

export function CTA() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[oklch(0.17_0.04_260)] px-6 py-16 text-center text-white sm:px-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-float-slow rounded-full bg-[var(--brand)]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-float-slow rounded-full bg-[var(--info)]/25 blur-3xl [animation-delay:-7s]" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run a calmer operation, starting this week.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            Set up your workspace, add a warehouse and see your first alerts in minutes. Free for 14 days.
          </p>
          <CtaButtons dark className="mt-8 justify-center" />
        </div>
      </Reveal>
    </section>
  );
}
