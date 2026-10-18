// src/components/landing/HowItWorks.tsx
import { LifecycleFlow } from "./LifecycleFlow";
import { Reveal } from "./motion";
import { SectionHeader } from "./shared";

export function HowItWorks() {
  return (
    <section id="lifecycle" className="scroll-mt-20 bg-gradient-to-b from-background via-brand-soft/40 to-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="From the factory floor to the customer’s door"
          description="Every stage of the flow lives in one connected system, so a production order, the stock it creates and the truck that delivers it all tell the same story."
        />
        <Reveal y={32} className="mt-16">
          <LifecycleFlow />
        </Reveal>
      </div>
    </section>
  );
}
