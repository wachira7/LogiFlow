// src/components/landing/contact.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Loader2, Mail, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "./motion";
import { SectionHeader } from "./shared";

const contactInfo = [
  { icon: Mail, title: "Email", content: "hello@logiflow.com", href: "mailto:hello@logiflow.com" },
  { icon: Phone, title: "Phone", content: "+254 705 274244", href: "tel:+254705274244" },
  { icon: Clock, title: "Hours", content: "Mon–Fri, 8:00–18:00 EAT" },
];

const emptyForm = { name: "", email: "", company: "", phone: "", inquiryType: "", message: "" };

export function Contact() {
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to send");
      setSubmitStatus("success");
      setFormData(emptyForm);
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof emptyForm, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <section id="contact" className="scroll-mt-20 bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Contact"
          title="Talk to the team"
          description="Book a demo, ask about pricing or tell us about your operation. We’ll get back to you as soon as we can."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          <Reveal className="space-y-4">
            {contactInfo.map(({ icon: Icon, title, content, href }) => {
              const body = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                    <Icon className="h-5 w-5 text-brand" />
                  </span>
                  <span>
                    <span className="block text-sm text-muted-foreground">{title}</span>
                    <span className="block font-medium">{content}</span>
                  </span>
                </>
              );
              return href ? (
                <a key={title} href={href} className="card-lift flex items-center gap-4 rounded-xl border border-border bg-card p-5">
                  {body}
                </a>
              ) : (
                <div key={title} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
                  {body}
                </div>
              );
            })}
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <AnimatePresence mode="wait">
                {submitStatus === "success" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-[420px] flex-col items-center justify-center text-center"
                    role="status"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft"
                    >
                      <CheckCircle2 className="h-7 w-7 text-success" />
                    </motion.span>
                    <h3 className="mt-5 text-xl font-semibold">Message sent</h3>
                    <p className="mt-2 max-w-sm text-muted-foreground">
                      Thanks for reaching out. We&apos;ll get back to you as soon as we can.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setSubmitStatus("idle")}>
                      Send another message
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="grid gap-5 sm:grid-cols-2"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" required autoComplete="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work email *</Label>
                      <Input id="email" type="email" required autoComplete="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" autoComplete="organization" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="inquiryType">What can we help with?</Label>
                      <Select value={formData.inquiryType} onValueChange={(v) => handleChange("inquiryType", v)}>
                        <SelectTrigger id="inquiryType" className="w-full">
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo">Book a demo</SelectItem>
                          <SelectItem value="pricing">Pricing</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        required
                        rows={5}
                        placeholder="Tell us about your warehouses, fleet and what you'd like to improve."
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm" role="alert" aria-live="polite">
                        {submitStatus === "error" && (
                          <span className="text-danger">Something went wrong. Please try again or email us directly.</span>
                        )}
                      </p>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="btn-shine group bg-brand text-brand-foreground hover:bg-brand/90"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                          </>
                        ) : (
                          <>
                            Send message <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
