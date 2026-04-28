"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/utils/constants";

export const Header = () => {
  const { currentUser, userRole, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push("/");
    }
  };

  const getNavLinks = () => {
    if (userRole === USER_ROLES.CREW) {
      return [
        { href: "/crew/dashboard", label: "Dashboard" },
        { href: "/crew/requests", label: "Requests" },
        { href: "/crew/verify", label: "Verify" },
      ];
    }
    if (userRole === USER_ROLES.ORGANIZER) {
      return [
        { href: "/organizer/dashboard", label: "Dashboard" },
        { href: "/organizer/search", label: "Search Crew" },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">CrewHive</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground hover:text-primary transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {currentUser.phoneNumber}
                </span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/auth/phone">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground hover:bg-muted rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 text-foreground hover:bg-muted rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {currentUser ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/auth/phone"
                className="block px-4 py-2 text-foreground hover:bg-muted rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
