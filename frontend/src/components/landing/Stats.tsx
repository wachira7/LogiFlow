// frontend/src/components/landing/Stats.tsx
"use client"

import { useEffect, useRef } from "react"
import { TrendingUp, Users, Package, Globe, Clock, DollarSign } from "lucide-react"
import { gsap } from "gsap"
import { useFadeInUp, useCountUp } from "@/hooks/useGsap"

const stats = [
  {
    icon: Users,
    value: 500,
    suffix: "+",
    label: "Active Companies",
    description: "Businesses trust Logiflow",
  },
  {
    icon: Package,
    value: 10,
    suffix: "M+",
    label: "Shipments Processed",
    description: "Monthly transaction volume",
  },
  {
    icon: Globe,
    value: 50,
    suffix: "+",
    label: "Countries Served",
    description: "Global logistics coverage",
  },
  {
    icon: TrendingUp,
    value: 30,
    suffix: "%",
    label: "Cost Reduction",
    description: "Average savings achieved",
  },
  {
    icon: Clock,
    value: 99.9,
    suffix: "%",
    label: "Uptime Guarantee",
    description: "Reliable service availability",
  },
  {
    icon: DollarSign,
    value: 2.5,
    suffix: "B+",
    label: "Goods Managed",
    description: "Total value processed annually",
  },
]

export function Stats() {
  const headerRef = useFadeInUp<HTMLDivElement>()
  const statsGridRef = useRef<HTMLDivElement>(null)
  const ctaRef = useFadeInUp<HTMLDivElement>()

  useEffect(() => {
    if (statsGridRef.current) {
      const statElements = statsGridRef.current.children

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
      )
    }
  }, [])

  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">Trusted by Industry Leaders</h2>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
            Join thousands of companies that have transformed their logistics operations with Logiflow.
          </p>
        </div>

        {/* Stats Grid */}
        <div ref={statsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center group">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-foreground/10 rounded-2xl mx-auto mb-4 group-hover:bg-primary-foreground/20 transition-all duration-300 group-hover:scale-110">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="font-serif font-bold text-4xl lg:text-5xl mb-2">
                  <CountUpNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="font-medium text-lg mb-1">{stat.label}</div>
                <div className="text-primary-foreground/70 text-sm">{stat.description}</div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div ref={ctaRef} className="text-center mt-16">
          <p className="text-primary-foreground/80 text-lg mb-6">Ready to join the logistics revolution?</p>
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
  )
}

function CountUpNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useCountUp<HTMLSpanElement>(value)

  return (
    <span>
      <span ref={ref}>0</span>
      {suffix}
    </span>
  )
}