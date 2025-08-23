"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "button" | "dropdown"
  size?: "sm" | "default" | "lg"
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ 
  variant = "button", 
  size = "sm",
  showLabel = false,
  className 
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    
    // Optional: Add haptic feedback on mobile
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
    
    // Analytics tracking (optional)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-expect-error gtag is not a standard property of the window object
      window.gtag('event', 'theme_change', {
        event_category: 'UI',
        event_label: newTheme,
      })
    }
  }

  const handleToggle = () => {
    const currentTheme = resolvedTheme || theme
    const newTheme = currentTheme === "light" ? "dark" : "light"
    handleThemeChange(newTheme)
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={size}
        className={cn("w-9 h-9 p-0", className)}
        disabled
      >
        <div className="h-4 w-4 animate-pulse bg-muted-foreground/20 rounded" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    )
  }

  const currentTheme = resolvedTheme || theme
  
  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getThemeLabel = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return 'Light mode'
      case 'dark':
        return 'Dark mode'
      case 'system':
        return 'System preference'
      default:
        return 'Toggle theme'
    }
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size={size} 
            className={cn("w-9 h-9 p-0", className)}
          >
            {currentTheme && getThemeIcon(currentTheme)}
            <span className="sr-only">Open theme menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Theme Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleThemeChange("light")}
            className={cn("cursor-pointer", theme === "light" && "bg-accent")}
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
            {theme === "light" && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleThemeChange("dark")}
            className={cn("cursor-pointer", theme === "dark" && "bg-accent")}
          >
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
            {theme === "dark" && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleThemeChange("system")}
            className={cn("cursor-pointer", theme === "system" && "bg-accent")}
          >
            <Monitor className="mr-2 h-4 w-4" />
            <span>System</span>
            {theme === "system" && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Currently: {getThemeLabel(currentTheme ?? 'light')}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button 
      variant="ghost" 
      size={size} 
      onClick={handleToggle}
      className={cn(
        "relative overflow-hidden",
        size === "sm" ? "w-9 h-9 p-0" : "px-3",
        className
      )}
      title={`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
    >
      {/* Animated icons with smooth transitions */}
      <Sun className={cn(
        "h-4 w-4 transition-all duration-300 ease-in-out",
        currentTheme === "dark" 
          ? "rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100"
      )} />
      <Moon className={cn(
        "absolute h-4 w-4 transition-all duration-300 ease-in-out",
        currentTheme === "dark" 
          ? "rotate-0 scale-100 opacity-100" 
          : "-rotate-90 scale-0 opacity-0"
      )} />
      
      {showLabel && (
        <span className="ml-2 text-sm">
          {currentTheme === "light" ? "Dark" : "Light"}
        </span>
      )}
      
      <span className="sr-only">
        {`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
      </span>
    </Button>
  )
}

// Simplified version for cases where you just want basic toggle
export function SimpleThemeToggle({ className }: { className?: string }) {
  return <ThemeToggle variant="button" className={className} />
}

// Advanced theme toggle with system preference
export function AdvancedThemeToggle({ className }: { className?: string }) {
  return <ThemeToggle variant="dropdown" className={className} />
}