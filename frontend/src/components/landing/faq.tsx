// src/components/landing/faq.tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "./motion";
import { SectionHeader } from "./shared";

// Answers describe what the product does today; keep them accurate when features change.
const faqs = [
  {
    q: "Who is LogiFlow for?",
    a: "Distributors, manufacturers, wholesalers, retailers and logistics providers that run warehouses, stock and deliveries, from a single depot to several sites. It was built in Africa and works for teams anywhere.",
  },
  {
    q: "How quickly can we get started?",
    a: "You can create your company workspace and start adding warehouses, products and team members in minutes. For larger rollouts, talk to us and we will help you plan the setup and bring your existing data in.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "M-Pesa (charged in KES at the current exchange rate), card payments through Stripe, and cryptocurrency through NOWPayments. Plans are priced in USD.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan includes a 14-day free trial. If you would like a walkthrough first, book a demo through the contact form below.",
  },
  {
    q: "How is our data kept separate and secure?",
    a: "Each company has its own workspace, and every request is scoped to your company, so other customers cannot see your data. Access is role-based, connections are encrypted, and passwords are stored as bcrypt hashes.",
  },
  {
    q: "Can we change plans later?",
    a: "You can move between plans from the billing section of your workspace. Quarterly billing saves 10% and annual billing saves 20% compared with paying monthly.",
  },
  {
    q: "Does LogiFlow integrate with other systems?",
    a: "LogiFlow has a documented REST API, so your developers can connect it to the tools you already use. Custom integrations are available on the Professional and Enterprise plans.",
  },
  {
    q: "Who owns our data?",
    a: "You do. If you decide to leave, contact us and we will help you export your data.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Questions, answered" />
        <Reveal delay={0.1} className="mt-12">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-5 transition-colors data-[state=open]:border-brand/50 data-[state=open]:shadow-lg data-[state=open]:shadow-brand/5"
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
