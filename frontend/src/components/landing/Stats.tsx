// frontend/src/components/landing/Stats.tsx
"use client";

import { useEffect, useRef } from "react";
import { TrendingUp, Users, Package, Globe, Clock, DollarSign } from "lucide-react";
import { gsap } from "gsap";
import { useFadeInUp, useCountUp } from "@/hooks/useGsap";

const stats = [
  {
    icon: Package,
    value: 10,
    suffix: "+",
    label: "Modules Built",
    description: "End-to-end logistics coverage",
  },
  {
    icon: Globe,
    value: 3,
    suffix: "",
    label: "Payment Integrations",
    description: "Stripe, M-Pesa & Crypto",
  },
  {
    icon: TrendingUp,
    value: 30,
    suffix: "%",
    label: "Average Cost Reduction",
    description: "Reported by logistics teams",
  },
  {
    icon: Clock,
    value: 99.9,
    suffix: "%",
    label: "Uptime Target",
    description: "Built for reliability",
  },
  {
    icon: Users,
    value: 5,
    suffix: "+",
    label: "User Roles Supported",
    description: "From warehouse staff to admins",
  },
  {
    icon: DollarSign,
    value: 14,
    suffix: "+",
    label: "Supported Currencies",
    description: "Including KES, USD, EUR",
  },
];

export function Stats() {
  const headerRef = useFadeInUp<HTMLDivElement>();
  const statsGridRef = useRef<HTMLDivElement>(null);
  const ctaRef = useFadeInUp<HTMLDivElement>();

  useEffect(() => {
    if (statsGridRef.current) {
      const statElements = statsGridRef.current.children;

      gsap.fromTo(
        statElements,
        {
          opacity: 0,
          y: 50,
          scale: 0.8,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: statsGridRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }
  }, []);

  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
            Built for Modern Logistics
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
          A complete platform covering every aspect of your logistics operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div
          ref={statsGridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center group">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-foreground/10 rounded-2xl mx-auto mb-4 group-hover:bg-primary-foreground/20 transition-all duration-300 group-hover:scale-110">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="font-serif font-bold text-4xl lg:text-5xl mb-2">
                  <CountUpNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="font-medium text-lg mb-1">{stat.label}</div>
                <div className="text-primary-foreground/70 text-sm">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div ref={ctaRef} className="text-center mt-16">
          <p className="text-primary-foreground/80 text-lg mb-6">
            Ready to join the logistics revolution?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary-foreground text-primary px-8 py-3 rounded-lg font-medium hover:bg-primary-foreground/90 transition-all hover:scale-105">
              Start Free Trial
            </button>
            <button className="border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary-foreground/10 transition-all hover:scale-105">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountUpNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useCountUp<HTMLSpanElement>(value);

  return (
    <span>
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}
