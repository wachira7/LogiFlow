"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, TrendingUp, Users, Globe } from "lucide-react";
import { gsap } from "gsap";
import { useFadeInUp, useStaggerAnimation } from "@/hooks/useGsap";
import { useLazyLoading } from "@/hooks/use-lazy-loading";
import Image from "next/image";

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  // Use generic types for proper TypeScript typing
  const badgeRef = useFadeInUp<HTMLDivElement>(0.2);
  const titleRef = useFadeInUp<HTMLHeadingElement>(0.4);
  const subtitleRef = useFadeInUp<HTMLParagraphElement>(0.6);
  const buttonsRef = useFadeInUp<HTMLDivElement>(0.8);
  const statsRef = useStaggerAnimation<HTMLDivElement>();

  // Fix: Use generic type for lazy loading hook
  const { elementRef: bgRef, isInView } = useLazyLoading<HTMLDivElement>({
    threshold: 0.1,
  });

  useEffect(() => {
    if (heroRef.current && isInView) {
      const bgImage = heroRef.current.querySelector(".hero-bg");
      if (bgImage) {
        gsap.fromTo(
          bgImage,
          { scale: 1.1, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" },
        );
      }
    }

    // Animate scroll indicator
    gsap.to(".scroll-indicator", {
      y: 10,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
  }, [isInView]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div ref={bgRef} className="absolute inset-0 z-0">
        {isInView && (
          <Image
            src="/modern-logistics-warehouse.png"
            alt="Modern logistics warehouse"
            fill
            className="hero-bg object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div
            ref={badgeRef}
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Trusted by 500+ logistics companies worldwide
          </div>

          {/* Main Headline */}
          <h1
            ref={titleRef}
            className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-tight"
          >
            Revolutionize Your{" "}
            <span className="text-primary">Logistics Management</span>
          </h1>

          {/* Subheading */}
          <p
            ref={subtitleRef}
            className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Efficient, reliable, and tailored solutions for your business.
            Streamline operations, reduce costs, and scale with confidence.
          </p>

          {/* CTA Buttons */}
          <div
            ref={buttonsRef}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button
              size="lg"
              onClick={() => scrollToSection("contact")}
              className="bg-cta hover:bg-cta/90 text-cta-foreground px-8 py-3 text-lg hover:scale-105 transition-transform"
            >
              Schedule a Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 text-lg bg-transparent hover:scale-105 transition-transform"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Overview
            </Button>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="font-serif font-bold text-2xl text-foreground">
                500+
              </div>
              <div className="text-sm text-muted-foreground">
                Active Companies
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="font-serif font-bold text-2xl text-foreground">
                30%
              </div>
              <div className="text-sm text-muted-foreground">
                Cost Reduction
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="font-serif font-bold text-2xl text-foreground">
                50+
              </div>
              <div className="text-sm text-muted-foreground">
                Countries Served
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
          <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
