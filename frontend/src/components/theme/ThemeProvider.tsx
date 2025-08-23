"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

interface ExtendedThemeProviderProps extends ThemeProviderProps {
  children: React.ReactNode;
  enableColorScheme?: boolean;
}

export function ThemeProvider({
  children,
  enableColorScheme = true,
  ...props
}: ExtendedThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Ensure theme is properly initialized on mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent flash of wrong theme during hydration
  if (!mounted) {
    return (
      <div className="animate-pulse bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <NextThemesProvider
      enableColorScheme={enableColorScheme}
      storageKey="logiflow-theme"
      themes={["light", "dark", "system"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
