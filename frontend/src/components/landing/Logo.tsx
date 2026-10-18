// src/components/landing/Logo.tsx
import { cn } from "@/lib/utils";

/** LogiFlow mark (teal flow arrow around a navy parcel) plus wordmark. */
export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <path
          d="M6.5 22.5A11 11 0 0 1 22 6.2"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path d="M20.4 2.6 26 6.6l-6.1 3.1z" fill="var(--brand)" />
        <path
          d="M25.6 11.5A11 11 0 0 1 9.8 26"
          fill="none"
          stroke="var(--brand)"
          strokeOpacity="0.55"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path d="M16 10.5 21.5 13v6.6L16 22.2l-5.5-2.6V13z" fill="currentColor" />
        <path d="M10.5 13 16 15.6l5.5-2.6M16 15.6v6.6" fill="none" stroke="var(--background)" strokeWidth="1" />
      </svg>
      {showWordmark && <span className="text-lg font-semibold tracking-tight">LogiFlow</span>}
    </span>
  );
}
