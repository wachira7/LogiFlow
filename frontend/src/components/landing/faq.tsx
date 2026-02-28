"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useGSAP } from "@/hooks/useGsap";
import { gsap } from "gsap";

const faqs = [
  {
    question: "How long does it take to implement Logiflow?",
    answer:
      "Implementation typically takes 2-4 weeks depending on your current systems and data complexity. Our team provides full onboarding support, data migration assistance, and training to ensure a smooth transition.",
  },
  {
    question: "Can Logiflow integrate with our existing ERP and WMS systems?",
    answer:
      "Yes, Logiflow offers robust API integrations with popular ERP systems (SAP, Oracle, NetSuite), WMS platforms, and shipping carriers. Our integration team will work with you to ensure seamless data flow between systems.",
  },
  {
    question: "Is my logistics data secure with Logiflow?",
    answer:
      "Absolutely. We maintain SOC 2 Type II compliance, use enterprise-grade encryption, and follow strict data privacy protocols. Your data is hosted on secure cloud infrastructure with regular backups and 99.9% uptime guarantee.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "We offer 24/7 technical support, dedicated account management for Enterprise clients, comprehensive documentation, video tutorials, and regular training sessions. Our support team averages under 2-hour response times.",
  },
  {
    question: "Can I customize Logiflow for my specific logistics needs?",
    answer:
      "Yes, Logiflow is highly configurable. You can customize workflows, reports, dashboards, and business rules. For unique requirements, we offer custom development services and API access for advanced integrations.",
  },
  {
    question: "Do you offer a free trial or demo?",
    answer:
      "We provide a 14-day free trial with full platform access and sample data. Additionally, our sales team offers personalized demos tailored to your specific logistics challenges and use cases.",
  },
  {
    question: "What happens to my data if I decide to leave Logiflow?",
    answer:
      "You maintain full ownership of your data. We provide complete data export capabilities in standard formats (CSV, JSON, XML) and offer migration assistance to ensure you can transition smoothly to another platform if needed.",
  },
  {
    question: "How does pricing scale with my business growth?",
    answer:
      "Our pricing is designed to grow with your business. You can easily upgrade plans, add users, or increase transaction limits. We also offer volume discounts for large enterprises and custom pricing for unique requirements.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useGSAP<HTMLElement>();

  // Use proper useEffect for additional animations instead of incorrect hook usage
  useEffect(() => {
    if (containerRef.current) {
      // Additional GSAP animations can be added here if needed
      const faqItems = containerRef.current.querySelectorAll(".faq-item");
      gsap.from(faqItems, { opacity: 0, duration: 1, stagger: 0.2 });
    }
  }, [containerRef]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-background" ref={containerRef}>
      <div className="container mx-auto px-4 faq-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get answers to common questions about implementing and using
            Logiflow for your logistics operations.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-border rounded-lg overflow-hidden bg-card faq-item"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions? Our team is here to help.
          </p>
          <button
            onClick={() => {
              document.getElementById("contact")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
}
