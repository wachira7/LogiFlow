"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star, Quote, Play, Pause } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from 'next/image';

const testimonials = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "VP of Operations",
    company: "GlobalTech Logistics",
    image: "/professional-woman-diverse.png",
    content:
      "Logiflow transformed our operations completely. We reduced our delivery times by 40% and cut operational costs significantly. The real-time visibility alone has been game-changing for our business.",
    rating: 5,
    companyLogo: "/placeholder.svg?height=40&width=120&text=GlobalTech",
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    title: "Supply Chain Director",
    company: "MegaCorp Industries",
    image: "/professional-man.png",
    content:
      "The integration capabilities of Logiflow are outstanding. We connected all our existing systems seamlessly, and the analytics provide insights we never had before. Highly recommended!",
    rating: 5,
    companyLogo: "/placeholder.svg?height=40&width=120&text=MegaCorp",
  },
  {
    id: 3,
    name: "Emily Watson",
    title: "Logistics Manager",
    company: "Swift Distribution",
    image: "/businesswoman-ceo.png",
    content:
      "As a growing company, we needed a solution that could scale with us. Logiflow has been perfect - it's powerful enough for our current needs but flexible enough to grow with our business.",
    rating: 5,
    companyLogo: "/placeholder.svg?height=40&width=120&text=Swift",
  },
  {
    id: 4,
    name: "David Kim",
    title: "Warehouse Manager",
    company: "Rapid Logistics",
    image: "/warehouse-manager.png",
    content:
      "The customer support is exceptional, and the platform is incredibly intuitive. Our team was up and running in days, not weeks. The ROI has been substantial.",
    rating: 5,
    companyLogo: "/placeholder.svg?height=40&width=120&text=Rapid",
  },
  {
    id: 5,
    name: "Lisa Thompson",
    title: "Logistics Coordinator",
    company: "FlexiCorp",
    image: "/logistics-coordinator.png",
    content:
      "The automation features have saved us countless hours every week. What used to take our team days now happens automatically with incredible accuracy.",
    rating: 5,
    companyLogo: "/placeholder.svg?height=40&width=120&text=FlexiCorp",
  },
]

const companyLogos = [
  { name: "GlobalTech", logo: "/placeholder.svg?height=60&width=140&text=GlobalTech" },
  { name: "MegaCorp", logo: "/placeholder.svg?height=60&width=140&text=MegaCorp" },
  { name: "Swift Distribution", logo: "/placeholder.svg?height=60&width=140&text=Swift" },
  { name: "Rapid Logistics", logo: "/placeholder.svg?height=60&width=140&text=Rapid" },
  { name: "FlexiCorp", logo: "/placeholder.svg?height=60&width=140&text=FlexiCorp" },
  { name: "ProLogistics", logo: "/placeholder.svg?height=60&width=140&text=ProLogistics" },
]

export function Testimonials() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      nextTestimonial()
    }, 5000) // Change testimonial every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, currentTestimonial])

  const currentTest = testimonials[currentTestimonial]

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
            Trusted by <span className="text-primary">Industry Leaders</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how companies like yours have transformed their logistics operations with Logiflow.
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
                      <div className="font-semibold text-foreground">{currentTest.name}</div>
                      <div className="text-muted-foreground text-sm">{currentTest.title}</div>
                      <div className="text-primary text-sm font-medium">{currentTest.company}</div>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="sm" onClick={prevTestimonial} className="w-10 h-10 p-0 bg-transparent">
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="w-10 h-10 p-0 bg-transparent"
                >
                  {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <div className="flex space-x-2">
                  {testimonials.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentTestimonial ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={nextTestimonial} className="w-10 h-10 p-0 bg-transparent">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Logos */}
        <div className="text-center">
          <p className="text-muted-foreground mb-8">Trusted by leading companies worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-60">
            {companyLogos.map((company, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.1, opacity: 1 }}
              >
                <Image
                  src={company.logo || "/placeholder.svg"}
                  alt={`${company.name} logo`}
                  className="max-h-12 w-auto grayscale hover:grayscale-0 transition-all duration-300"
                  width={40}
                  height={40}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
