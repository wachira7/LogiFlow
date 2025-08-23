"use client"

import { useEffect, useRef, useState } from "react" // ✅ Added useState
import { gsap } from "gsap"
import { Check, Star, Zap, Crown, ArrowRight, Loader2 } from "lucide-react" // ✅ Added Loader2
import Link from "next/link"
import { Button } from "@/components/ui/button" // ✅ Added Button import
import { useToast } from "@/hooks/use-toast" // ✅ Added useToast import

// Define proper interface for pricing plans
interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  icon: JSX.Element;
  features: string[];
  limitations: string[];
  cta: string;
  popular: boolean;
  gradient: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: 69,
    period: "per/month",
    description: "Perfect for small businesses starting their logistics journey",
    icon: <Zap className="w-8 h-8" />,
    features: [
      "Up to 5 users",
      "2 warehouses",
      "1,000 products",
      "Basic inventory management",
      "Order processing",
      "Email support",
      "Mobile app access",
      "API access",
    ],
    limitations: ["Limited reporting", "Basic integrations only"],
    cta: "Start Free Trial",
    popular: false,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    name: "Professional",
    price: 159,
    period: "per/month",
    description: "Complete logistics solution for growing businesses",
    icon: <Star className="w-8 h-8" />,
    features: [
      "Up to 25 users",
      "5 warehouses",
      "10,000 products",
      "Full inventory management",
      "Advanced distribution & routing",
      "Production planning",
      "Multi-payment processing",
      "Priority support",
      "API access",
      "Real-time analytics",
      "Custom integrations",
      "Advanced reporting",
    ],
    limitations: [],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-cta to-cta/80",
  },
  {
    name: "Enterprise",
    price: 269,
    period: "per/month",
    description: "Advanced features for large-scale operations",
    icon: <Crown className="w-8 h-8" />,
    features: [
      "Unlimited users",
      "Unlimited warehouses",
      "Unlimited products",
      "Advanced analytics & reporting",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "White-label options",
      "Advanced audit logging",
      "Multi-tenant management",
      "Custom development",
      "24/7 phone support",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-orange-500 to-red-500",
  },
]

export function Pricing() {
  const pricingRef = useRef<HTMLDivElement>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null) // ✅ This was missing useState import
  const { toast } = useToast() // ✅ This was missing useToast import

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stagger animation for pricing cards
      gsap.from(".pricing-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".pricing-section",
          start: "top 80%",
        },
      })

      // Hover animations - Fix the type issue
      gsap.utils.toArray<HTMLElement>(".pricing-card").forEach((card) => {
        const tl = gsap.timeline({ paused: true })

        tl.to(card, {
          y: -10,
          scale: 1.02,
          duration: 0.3,
          ease: "power2.out",
        })

        card.addEventListener("mouseenter", () => tl.play())
        card.addEventListener("mouseleave", () => tl.reverse())
      })

      // Price number animations - Fix the type issue
      gsap.utils.toArray<HTMLElement>(".price-number").forEach((price) => {
        gsap.from(price, {
          textContent: 0,
          duration: 1.5,
          snap: { textContent: 1 },
          ease: "power2.out",
          scrollTrigger: {
            trigger: price,
            start: "top 85%",
          },
        })
      })
    }, pricingRef)

    return () => ctx.revert()
  }, [])

  const handleSelect = async (plan: PricingPlan) => {
    console.log('Selected plan:', plan)
    
    // Set loading state
    setLoadingPlan(plan.name)
    
    try {
      // Track analytics
      if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-expect-error gtag is not defined in the TypeScript type definitions for the window object
        window.gtag('event', 'begin_checkout', {
          event_category: 'Pricing',
          event_label: plan.name,
          value: plan.price,
          currency: 'USD'
        })
      }
      
      // Check authentication status
      const authToken = localStorage.getItem('authToken')
      
      if (!authToken) {
        // Store plan selection and redirect to auth
        sessionStorage.setItem('pendingPlan', JSON.stringify(plan))
        
        // Show notification
        toast({
          title: "Sign up required",
          description: `Please create an account to subscribe to the ${plan.name} plan.`,
          action: (
            <Button 
              onClick={() => window.location.href = '/auth/register'}
              size="sm"
            >
              Sign Up
            </Button>
          )
        })
        
        return
      }
      
      // User is authenticated, create subscription
      const subscriptionData = {
        plan_name: plan.name.toLowerCase(),
        billing_cycle: plan.period.includes('month') ? 'monthly' : 'annual',
        features: plan.features,
        price: plan.price
      }
      
      const response = await fetch('/api/v1/payments/subscriptions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(subscriptionData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create subscription')
      }
      
      const subscription = await response.json()
      
      // Success! Redirect to payment or confirmation
      toast({
        title: "Plan Selected!",
        description: `Successfully selected the ${plan.name} plan. Redirecting to payment...`,
      })
      
      // Small delay for user to see the success message
      setTimeout(() => {
        window.location.href = `/billing/subscriptions/${subscription.id}`
      }, 1500)
      
    } catch (error) {
      console.error('Error selecting plan:', error)
      
      toast({
        title: "Error",
        description: "Failed to select plan. Please try again.",
        variant: "destructive"
      })
    } finally {
      // Clear loading state
      setLoadingPlan(null)
    }
  }

  return (
    <div ref={pricingRef} className="pricing-section py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Choose Your Growth Plan</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From startup to enterprise, we have the perfect plan to scale your logistics operations. All plans include
            our core platform with varying limits and support levels.
          </p>

          {/* Value Proposition */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-primary mr-2" />
              14-day free trial
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-primary mr-2" />
              No setup fees
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-primary mr-2" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-primary mr-2" />
              30-day money back guarantee
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`pricing-card relative bg-card rounded-2xl shadow-xl overflow-hidden border border-border ${
                plan.popular ? "ring-4 ring-primary ring-opacity-50" : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Card Header */}
              <div className={`bg-gradient-to-r ${plan.gradient} text-white p-8 text-center`}>
                <div className="text-white/80 mb-4">{plan.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-white/90 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-5xl font-bold">
                    $
                    <span className="price-number" data-price={plan.price}>
                      {plan.price}
                    </span>
                  </span>
                  <span className="text-white/80 text-lg ml-2">{plan.period}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-8">
                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}

                  {/* Limitations */}
                  {plan.limitations.map((limitation, limitIndex) => (
                    <li key={`limit-${limitIndex}`} className="flex items-start opacity-60">
                      <span className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="text-center">
                  {plan.cta === "Contact Sales" ? (
                    <Link
                      href="/contact"
                      className={`block w-full bg-gradient-to-r ${plan.gradient} text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300 group`}
                    >
                      {plan.cta}
                      <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <button 
                      onClick={() => handleSelect(plan)}
                      disabled={loadingPlan === plan.name} // ✅ Added disabled state
                      className="block w-full bg-cta hover:bg-cta/90 disabled:opacity-50 disabled:cursor-not-allowed text-cta-foreground py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300 group"
                    >
                      {loadingPlan === plan.name ? ( // ✅ Added loading state
                        <>
                          <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {plan.cta}
                          <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Additional Info */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {plan.name === "Enterprise" ? "Custom pricing available" : "Billed monthly or annually"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Plus */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-muted to-muted/50 border border-border text-foreground rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Enterprise Plus</h3>
            <p className="text-muted-foreground mb-6">
              Need custom solutions for your industry? We offer tailored logistics platforms for Fortune 500 companies,
              government agencies, and global logistics providers.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm mb-6">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">Custom Development</span>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">On-premise Deployment</span>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">Dedicated Infrastructure</span>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">24/7 Dedicated Support</span>
            </div>
            <button className="inline-flex items-center bg-cta hover:bg-cta/90 text-cta-foreground px-8 py-3 rounded-xl font-semibold transition-colors group">
              Contact Enterprise Sales
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">Have questions about our pricing?</p>
          <Link href="/pricing" className="text-primary hover:text-primary/80 font-semibold">
            View detailed pricing FAQ →
          </Link>
        </div>
      </div>
    </div>
  )
}