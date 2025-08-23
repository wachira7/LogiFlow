import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { About } from "@/components/landing/about";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section id="hero">
        <Hero />
      </section>

      {/* Problem & Solution */}
      <section id="problem-solution">
        <ProblemSolution />
      </section>

      {/* Features Section */}
      <section id="features">
        <Features />
      </section>

      {/* Stats Section */}
      <Stats />

      {/* About Section */}
      <section id="about">
        <About />
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Pricing Section */}
      <section id="pricing">
        <Pricing />
      </section>

      {/* FAQ Section */}
      <section id="faq">
        <FAQ />
      </section>

      {/* Contact Section */}
      <section id="contact">
        <Contact />
      </section>

      {/* Final CTA Section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </main>
  );
}
