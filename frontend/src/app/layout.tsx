// src/app/layout.tsx 
import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext"; 
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "LogiFlow — Logistics operations platform",
    template: "%s | LogiFlow",
  },
  description:
    "Production, warehousing, inventory, dispatch and billing in one workspace. See what's moving, what's late and what to do next. Pay with M-Pesa, card or crypto.",
  generator: "Next.js",
  applicationName: "LogiFlow",
  referrer: "origin-when-cross-origin",
  keywords: [
    "logistics",
    "supply chain management",
    "warehouse management",
    "fleet tracking",
    "inventory management",
    "distribution",
    "shipping",
    "logistics software",
    "supply chain optimization",
    "freight management",
  ],
  authors: [{ name: "LogiFlow Team", url: "https://logiflow.com" }],
  creator: "LogiFlow",
  publisher: "LogiFlow",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LogiFlow — Logistics operations platform",
    description:
      "Production, warehousing, inventory, dispatch and billing in one workspace. See what's moving, what's late and what to do next. Pay with M-Pesa, card or crypto.",
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "LogiFlow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LogiFlow — Logistics operations platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LogiFlow — Logistics operations platform",
    description:
      "Production, warehousing, inventory, dispatch and billing in one workspace. See what's moving, what's late and what to do next. Pay with M-Pesa, card or crypto.",
    images: ["/og-image.png"],
    creator: "@logiflow",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* DNS prefetch for potential external resources */}
        <link rel="dns-prefetch" href="https://api.logiflow.com" />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "LogiFlow",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Comprehensive logistics management platform for businesses of all sizes",
              url: "https://logiflow.com",
              creator: {
                "@type": "Organization",
                name: "LogiFlow",
              },
              offers: {
                "@type": "Offer",
                category: "SaaS",
                eligibleRegion: "Worldwide",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
            >
              Skip to main content
            </a>

            {/* Main content wrapper */}
            <div id="main-content" className="relative">
              {children}
            </div>

            {/* Loading indicator for better UX */}
            <div
              id="loading-indicator"
              className="fixed top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-cta z-50 transform -translate-x-full transition-transform duration-300"
              aria-hidden="true"
            />

            {/* Toast notifications */}
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
          </AuthProvider>
        </ThemeProvider>

        {/* Analytics and Performance Scripts */}
        {process.env.NODE_ENV === "production" && (
          <>
            {/* Google Analytics - Replace GA_MEASUREMENT_ID with your actual ID */}
            {process.env.NEXT_PUBLIC_GA_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}