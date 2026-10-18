// src/components/landing/Footer.tsx
import Link from "next/link";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#product" },
      { label: "How it works", href: "#lifecycle" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Start free trial", href: "/auth/register" },
      { label: "Log in", href: "/auth/login" },
      { label: "Book a demo", href: "#contact" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "hello@logiflow.com", href: "mailto:hello@logiflow.com" },
      { label: "+254 705 274244", href: "tel:+254705274244" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="md:col-span-2">
          <Link href="/" className="text-primary dark:text-foreground" aria-label="LogiFlow home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Production, warehousing, inventory and delivery in one workspace. Built in Africa, for logistics teams
            everywhere.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-brand">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} LogiFlow. All rights reserved.</p>
          <p>Where logistics flows seamlessly.</p>
        </div>
      </div>
    </footer>
  );
}
