// src/components/landing/shared.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  dark = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-sm font-semibold uppercase tracking-widest", dark ? "text-[var(--brand)]" : "text-brand")}>
        {eyebrow}
      </p>
      <h2 className={cn("mt-3 text-3xl font-semibold tracking-tight sm:text-4xl", dark ? "text-white" : "text-foreground")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-lg", dark ? "text-white/70" : "text-muted-foreground")}>{description}</p>
      )}
    </Reveal>
  );
}

export function CtaButtons({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button
        asChild
        size="lg"
        className="btn-shine group bg-brand text-brand-foreground shadow-lg shadow-brand/25 hover:bg-brand/90"
      >
        <Link href="/auth/register">
          Start 14-day free trial
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className={dark ? "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" : "bg-background"}
      >
        <Link href="/demo">Try the live demo</Link>
      </Button>
    </div>
  );
}
