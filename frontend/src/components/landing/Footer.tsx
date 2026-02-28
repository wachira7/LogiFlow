// frontend/src/components/landing/Footer.tsx
"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Twitter, Linkedin, Github } from "lucide-react";
import Image from "next/image";

const footerLinks = {
  product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Integrations", href: "/integrations" },
    { name: "API Documentation", href: "/docs" },
  ],
  company: [
    { name: "About Us", href: "#about" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Partners", href: "/partners" },
  ],
  resources: [
    { name: "Blog", href: "/blog" },
    { name: "Help Center", href: "/help" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Webinars", href: "/webinars" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Security", href: "/security" },
    { name: "Compliance", href: "/compliance" },
  ],
};

const socialLinks = [
  { name: "Twitter", href: "https://twitter.com/logiflow", icon: Twitter },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/logiflow",
    icon: Linkedin,
  },
  { name: "GitHub", href: "https://github.com/logiflow", icon: Github },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative w-10 h-10">
                <Image
                  src="/logiflow-logo.png"
                  alt="Logiflow Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">
                Logiflow
              </span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Revolutionizing logistics management with efficient, reliable, and
              tailored solutions for modern businesses.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>hello@logiflow.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+254 705274244</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col items-center md:items-start space-y-3">
            <p className="text-muted-foreground text-sm">
              © 2025 Logiflow. All rights reserved.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Powered by</span>
              <div className="relative w-6 h-6">
                <Image
                  src="/warutech-logo.png"
                  alt="WARUTECH"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                WARUTECH
              </span>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.name}
                  href={social.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
