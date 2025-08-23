"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Users, Target, Zap, ArrowRight } from "lucide-react"
import Image from 'next/image';

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're committed to revolutionizing logistics through innovative technology and exceptional service.",
  },
  {
    icon: Users,
    title: "Customer-Centric",
    description: "Every feature we build is designed with our customers' success and operational efficiency in mind.",
  },
  {
    icon: Award,
    title: "Industry Expertise",
    description: "Our team combines decades of logistics experience with cutting-edge technology expertise.",
  },
  {
    icon: Zap,
    title: "Innovation First",
    description: "We continuously evolve our platform to stay ahead of industry trends and customer needs.",
  },
]

const teamStats = [
  { label: "Years of Experience", value: "15+" },
  { label: "Logistics Experts", value: "50+" },
  { label: "Countries Covered", value: "50+" },
  { label: "Customer Success Rate", value: "98%" },
]

export function About() {
  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Users className="w-4 h-4 mr-2" />
            About Logiflow
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Built by <span className="text-primary">Logistics Experts</span> for Modern Businesses
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Founded in 2018, Logiflow emerged from the real-world challenges faced by logistics professionals who needed
            better tools to manage complex supply chains.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Story Content */}
          <div>
            <h3 className="font-serif font-bold text-2xl lg:text-3xl text-foreground mb-6">Our Story</h3>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Logiflow was born from a simple observation: logistics operations were becoming increasingly complex,
                but the tools available weren&apos;t keeping pace. Our founders, veterans of the logistics industry,
                experienced firsthand the frustration of managing operations across fragmented systems.
              </p>
              <p>
                Today, we serve over 500 companies worldwide, from growing startups to Fortune 500 enterprises. Our
                platform has processed over 10 million shipments and helped businesses reduce operational costs by an
                average of 30%.
              </p>
              <p>
                We believe that great logistics software should be powerful yet intuitive, comprehensive yet flexible.
                That&apos;s why we&apos;ve built Logiflow as a unified platform that grows with your business.
              </p>
            </div>
            <div className="mt-8">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Learn More About Our Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Team Image */}
          <div className="relative">
            <Image
              src="/placeholder.svg?height=400&width=600&text=Logiflow+Team"
              alt="Logiflow team working together"
              className="rounded-2xl shadow-lg"
              width={600}
              height={400}
            />
            <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h3 className="font-serif font-bold text-2xl lg:text-3xl text-foreground text-center mb-12">Our Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Card key={index} className="text-center border-border hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-serif font-semibold text-lg text-foreground mb-3">{value.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Team Stats */}
        <div className="bg-card rounded-2xl p-8 lg:p-12 border border-border">
          <div className="text-center mb-8">
            <h3 className="font-serif font-bold text-2xl lg:text-3xl text-foreground mb-4">Why Trust Logiflow?</h3>
            <p className="text-muted-foreground">Our expertise and commitment to excellence speak for themselves.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {teamStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-serif font-bold text-3xl lg:text-4xl text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
