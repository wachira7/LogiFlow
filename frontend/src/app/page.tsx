// src/app/page.tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FactsStrip } from "@/components/landing/FactsStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { LiveTracking } from "@/components/landing/LiveTracking";
import { Payments } from "@/components/landing/Payments";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main id="main-content" className="min-h-screen">
        <Hero />
        <FactsStrip />
        <HowItWorks />
        <Features />
        <LiveTracking />
        <Payments />
        <Pricing />
        <FAQ />
        <Contact />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
