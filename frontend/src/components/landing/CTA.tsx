"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Zap, Users, Shield } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    text: "Get started in under 5 minutes",
  },
  {
    icon: Users,
    text: "Join 500+ satisfied customers",
  },
  {
    icon: Shield,
    text: "30-day money-back guarantee",
  },
];

export function CTA() {
  return (
    <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl mb-6">
            Ready to Revolutionize Your Logistics?
          </h2>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto mb-8">
            Join thousands of companies that have transformed their operations
            with Logiflow. Start your free trial today and see the difference in
            just minutes.
          </p>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                  <span className="text-primary-foreground/90">
                    {benefit.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              className="bg-cta text-cta-foreground hover:bg-cta/90 px-8 py-4 text-lg font-semibold"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 py-4 text-lg bg-transparent"
            >
              Schedule Demo
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-lg mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">
                Free 30-Day Trial
              </h3>
              <p className="text-primary-foreground/80 text-sm">
                No credit card required. Full access to all features. Cancel
                anytime.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-lg mx-auto mb-4">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">
                Expert Support
              </h3>
              <p className="text-primary-foreground/80 text-sm">
                Dedicated onboarding and 24/7 support from logistics experts.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-lg mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">
                Quick Setup
              </h3>
              <p className="text-primary-foreground/80 text-sm">
                Get up and running in minutes with our intuitive setup wizard.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-16">
          <p className="text-primary-foreground/70 text-sm mb-4">
            Trusted by industry leaders worldwide
          </p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="text-primary-foreground/60 text-xs">
              SOC 2 Compliant
            </div>
            <div className="text-primary-foreground/60 text-xs">GDPR Ready</div>
            <div className="text-primary-foreground/60 text-xs">
              99.9% Uptime
            </div>
            <div className="text-primary-foreground/60 text-xs">
              Enterprise Security
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
