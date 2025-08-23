// frontend/src/components/landing/Features.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Warehouse,
  Truck,
  BarChart3,
  Shield,
  Clock,
  Globe,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useFadeInUp, useStaggerAnimation } from "@/hooks/useGsap";
import Image from "next/image";

const features = [
  {
    icon: Warehouse,
    title: "Inventory Management",
    description:
      "Real-time tracking of stock levels, automated reordering, and comprehensive warehouse management across multiple locations.",
  },
  {
    icon: Truck,
    title: "Fleet & Distribution",
    description:
      "Optimize delivery routes, track vehicles in real-time, and manage your entire distribution network efficiently.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Powerful insights with customizable dashboards, performance metrics, and predictive analytics for better decision making.",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description:
      "Enterprise-grade security with role-based access control, audit trails, and compliance with industry standards.",
  },
  {
    icon: Clock,
    title: "Real-time Tracking",
    description:
      "Monitor shipments, inventory movements, and operations in real-time with automated notifications and alerts.",
  },
  {
    icon: Globe,
    title: "Multi-location Support",
    description:
      "Manage operations across multiple warehouses, distribution centers, and regions from a single platform.",
  },
];

const benefits = [
  "Reduce operational costs by up to 30%",
  "Improve delivery times and customer satisfaction",
  "Streamline inventory management processes",
  "Enhance visibility across your supply chain",
  "Scale operations without complexity",
  "Integrate with existing business systems",
];

export function Features() {
  // Use proper generic typing for the hooks
  const headerRef = useFadeInUp<HTMLDivElement>();
  const featuresGridRef = useStaggerAnimation<HTMLDivElement>();
  const benefitsRef = useFadeInUp<HTMLDivElement>();

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Powerful Features
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Everything You Need to{" "}
            <span className="text-primary">Optimize Logistics</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive tools and features designed to streamline your
            logistics operations and drive business growth.
          </p>
        </div>

        {/* Features Grid */}
        <div
          ref={featuresGridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-border hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div
          ref={benefitsRef}
          className="bg-card rounded-2xl p-8 lg:p-12 border border-border"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="font-serif font-bold text-2xl lg:text-3xl text-foreground mb-6">
                Why Choose Logiflow?
              </h3>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Image
                src="/placeholder-fe0bo.png"
                width={500}
                height={500}
                alt="Logiflow Dashboard Interface"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
