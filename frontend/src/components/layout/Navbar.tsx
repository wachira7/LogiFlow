// frontend/src/components/layout/Navbar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Building,
  ChevronDown,
} from "lucide-react";
import { gsap } from "gsap";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentCompany = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/v1/tenants/company/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const companyData = await response.json();
        setCurrentCompany(companyData);
      }
    } catch (error) {
      console.error("Failed to get company data:", error);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token and get user data
      const response = await fetch("/api/v1/auth/profile/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);

        // Get current company info
        await getCurrentCompany(token);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentCompany]);

  useEffect(() => {
    // Check authentication status on mount
    checkAuthStatus();

    // Animate navigation on load
    gsap.fromTo(
      ".nav-container",
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
    );

    // Animate logo and menu items
    gsap.fromTo(
      ".nav-item",
      { opacity: 0, y: -20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.3,
        ease: "power2.out",
      },
    );
  }, [checkAuthStatus]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Call logout endpoint
      await fetch("/api/v1/auth/logout/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenExpiry");
      setIsAuthenticated(false);
      setUser(null);
      setCurrentCompany(null);

      // Redirect to landing page
      window.location.href = "/";
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setIsOpen(false); // Close mobile menu after clicking
  };

  // Different nav items based on auth state
  const publicNavItems = [
    { name: "Solutions", href: "problem-solution" },
    { name: "Features", href: "features" },
    { name: "Pricing", href: "pricing" },
    { name: "FAQ", href: "faq" },
    { name: "Resources", href: "about" },
    { name: "Contact", href: "contact" },
  ];

  const authenticatedNavItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Inventory", href: "/inventory" },
    { name: "Distribution", href: "/distribution" },
    { name: "Analytics", href: "/analytics" },
  ];

  const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  return (
    <nav className="nav-container sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className="nav-item flex items-center space-x-3 hover:scale-105 transition-transform"
            >
              <div className="relative w-10 h-10">
                <Image
                  src="/logiflow-logo.png"
                  alt="Logiflow Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">
                Logiflow
              </span>
            </Link>

            {/* Company indicator for authenticated users */}
            {isAuthenticated && currentCompany && (
              <div className="hidden md:flex items-center ml-4 pl-4 border-l border-border">
                <Building className="w-4 h-4 text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  {currentCompany.name}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item, index) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={`${item.name}-${index}`}
                    href={item.href}
                    className="nav-item text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-all hover:scale-105"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <button
                    key={`${item.name}-${index}`}
                    onClick={() => scrollToSection(item.href)}
                    className="nav-item text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-all hover:scale-105"
                  >
                    {item.name}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />

            {isLoading ? (
              <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
            ) : isAuthenticated && user ? (
              // Authenticated User Menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-auto px-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden lg:flex flex-col items-start">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.role}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/company/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Company Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/billing">
                      <Building className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Public User Buttons
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="bg-cta hover:bg-cta/90 text-cta-foreground"
                >
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />

            {/* Mobile user avatar or menu button */}
            {isAuthenticated && user ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card border-t border-border">
              {navItems.map((item) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground block px-3 py-2 text-base font-medium transition-colors w-full text-left"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <button
                    key={item.name}
                    onClick={() => scrollToSection(item.href)}
                    className="text-muted-foreground hover:text-foreground block px-3 py-2 text-base font-medium transition-colors w-full text-left"
                  >
                    {item.name}
                  </button>
                ),
              )}

              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-border">
                {isAuthenticated && user ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {getUserInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/company/settings"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground"
                    >
                      Company Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block px-3 py-2 text-base font-medium text-destructive hover:text-destructive/90 w-full text-left"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      asChild
                    >
                      <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      className="w-full bg-cta hover:bg-cta/90 text-cta-foreground"
                      asChild
                    >
                      <Link
                        href="/auth/register"
                        onClick={() => setIsOpen(false)}
                      >
                        Get Started
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
