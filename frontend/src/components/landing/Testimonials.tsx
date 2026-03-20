// frontend/src/components/landing/Testimonials.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, Quote, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: "Inventory Management",
    title: "Track every product",
    company: "LogiFlow Feature",
    image: "/modern-logistics-warehouse.png",
    content:
      "Real-time inventory tracking across multiple warehouses. Set reorder points, track stock movements, and never run out of critical items again.",
    rating: 5,
  },
  {
    id: 2,
    name: "Distribution & Routing",
    title: "Optimize every delivery",
    company: "LogiFlow Feature",
    image: "/warehousemovement.png",
    content:
      "Plan delivery routes, track shipments in real-time with Leaflet maps, and manage your entire distribution network from one dashboard.",
    rating: 5,
  },
  {
    id: 3,
    name: "Multi-tenant Architecture",
    title: "Scale with confidence",
    company: "LogiFlow Feature",
    image: "/modernwarehousepic.png",
    content:
      "Built for multiple companies on one platform. Each tenant gets isolated data, custom settings, and their own subscription plan.",
    rating: 5,
  },
  {
    id: 4,
    name: "Payments & Billing",
    title: "Get paid your way",
    company: "LogiFlow Feature",
    image: "/professional-man.png",
    content:
      "Accept payments via Stripe, M-Pesa, or cryptocurrency. Automated billing, subscription management, and financial reporting built in.",
    rating: 5,
  },
  {
    id: 5,
    name: "Analytics & Reporting",
    title: "Data-driven decisions",
    company: "LogiFlow Feature",
    image: "/businesswoman-ceo.png",
    content:
      "Comprehensive analytics across inventory, distribution, production and warehousing. Export reports and track KPIs that matter.",
    rating: 5,
  },
];



export function Testimonials() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      nextTestimonial();
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, currentTestimonial]);

  const currentTest = testimonials[currentTestimonial];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Star className="w-4 h-4 mr-2" />
            Customer Success Stories
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Everything Your <span className="text-primary">Logistics Team Needs</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From inventory to distribution, production to warehousing — LogiFlow covers every corner of your operations.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="mb-16">
          <Card className="max-w-4xl mx-auto border-border shadow-lg overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <div className="flex items-center justify-center mb-6">
                <Quote className="w-12 h-12 text-primary/30" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <blockquote className="text-xl lg:text-2xl text-center text-foreground leading-relaxed mb-8 font-medium">
                    &quot;{currentTest.content}&quot;
                  </blockquote>

                  <div className="flex items-center justify-center mb-6">
                    {[...Array(currentTest.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                      >
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="flex items-center justify-center space-x-4 mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <Image
                      src={currentTest.image || "/placeholder.svg"}
                      alt={currentTest.name}
                      className="w-16 h-16 rounded-full object-cover"
                      width={40}
                      height={40}
                    />
                    <div className="text-center">
                      <div className="font-semibold text-foreground">
                        {currentTest.name}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {currentTest.title}
                      </div>
                      <div className="text-primary text-sm font-medium">
                        {currentTest.company}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevTestimonial}
                  className="w-10 h-10 p-0 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="w-10 h-10 p-0 bg-transparent"
                >
                  {isAutoPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex space-x-2">
                  {testimonials.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentTestimonial
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextTestimonial}
                  className="w-10 h-10 p-0 bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
