"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/utils/constants";
import { Menu, X, Search } from "lucide-react";
import { toast } from "sonner";

export const Header = () => {
  const { currentUser, userRole, logout } = useAuth();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        toast.success(isMl ? "വിജയകരമായി സൈൻ ഔട്ട് ചെയ്തു" : "Signed out successfully");
        setShowLogoutModal(false);
        router.push("/");
      } else {
        toast.error(result.error || "Failed to sign out");
      }
    } catch (err) {
      toast.error(err.message || "Error signing out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getNavLinks = () => {
    if (userRole === USER_ROLES.CREW) {
      return [
        { href: "/crew/dashboard", label: isMl ? "ഡാഷ്‌ബോർഡ്" : "Dashboard" },
        { href: "/crew/requests", label: isMl ? "റിക്വസ്റ്റുകൾ" : "Requests" },
        { href: "/crew/setup", label: isMl ? "പ്രൊഫൈൽ എഡിറ്റ്" : "Edit Profile" },
      ];
    }
    if (userRole === USER_ROLES.ORGANIZER) {
      return [
        { href: "/organizer/dashboard", label: isMl ? "ഡാഷ്‌ബോർഡ്" : "Dashboard" },
        { href: "/organizer/search", label: isMl ? "ക്രൂവിനെ കണ്ടെത്തുക" : "Search Crew" },
        { href: "/organizer/requests", label: isMl ? "റിക്വസ്റ്റുകൾ" : "Requests" },
        { href: "/organizer/shortlist", label: isMl ? "ഷോർട്ട്‌ലിസ്റ്റ്" : "Shortlist" },
        { href: "/organizer/shows", label: isMl ? "ഇവന്റുകൾ" : "Shows" },
      ];
    }
    if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN) {
      return [
        { href: "/admin/dashboard", label: isMl ? "അഡ്മിൻ സെന്റർ" : "Admin Center" },
        { href: "/admin/approvals", label: isMl ? "അംഗീകാരങ്ങൾ" : "Approvals" },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
              aria-label="CrewHive Home"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#F5A623] to-[#DF9115] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(245,166,35,0.3)] group-hover:brightness-105 transition-all">
                <span className="text-zinc-950 font-black text-sm tracking-tight">
                  C
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
                  CrewHive
                </span>
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground hidden sm:inline-block">
                  Kerala AV Network
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 lg:gap-2 shrink-0">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap px-2.5 xl:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                      isActive
                        ? "text-primary font-bold bg-primary/10 border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <Link
                href="/organizer/search"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title={isMl ? "ക്രൂവിനെ തിരയുക" : "Search Crew"}
                aria-label="Search Crew"
              >
                <Search className="w-4 h-4" />
              </Link>

              <LanguageToggle />

              {currentUser ? (
                <>
                  <span className="text-xs text-muted-foreground font-mono hidden xl:inline-block">
                    {currentUser.phoneNumber}
                  </span>
                  <Button
                    type="button"
                    onClick={handleLogoutClick}
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground hover:bg-muted hover:text-foreground text-xs whitespace-nowrap cursor-pointer"
                  >
                    {isMl ? "സൈൻ ഔട്ട്" : "Logout"}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild variant="outline" size="sm" className="text-xs whitespace-nowrap">
                    <Link href="/login">
                      {isMl ? "സൈൻ ഇൻ" : "Sign In"}
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-primary text-black font-bold text-xs hover:bg-primary/90 whitespace-nowrap">
                    <Link href="/crew/onboarding">
                      {isMl ? "സൗജന്യ പ്രൊഫൈൽ" : "Create Profile"}
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Menu Button (< lg) */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <Link
                href="/organizer/search"
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                title={isMl ? "ക്രൂവിനെ തിരയുക" : "Search Crew"}
                aria-label="Search Crew"
              >
                <Search className="w-4 h-4" />
              </Link>
              <LanguageToggle compact />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground hover:bg-muted rounded-lg"
                aria-label="Toggle mobile menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile / Tablet Navigation (< lg) */}
          {isMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 space-y-2 border-t border-border">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary font-bold bg-primary/10 border border-primary/20"
                        : "text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogoutClick();
                  }}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-muted rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  {isMl ? "സൈൻ ഔട്ട്" : "Logout"}
                </button>
              ) : (
                <div className="space-y-2 px-2 pt-2">
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-foreground hover:bg-muted rounded-lg text-sm transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {isMl ? "സൈൻ ഇൻ" : "Sign In"}
                  </Link>
                  <Link
                    href="/crew/onboarding"
                    className="block px-4 py-2 bg-primary text-black font-bold rounded-lg text-sm transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {isMl ? "സൗജന്യ പ്രൊഫൈൽ നിർമ്മിക്കുക" : "Create Free Profile"}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
        title={isMl ? "സൈൻ ഔട്ട് ചെയ്യണോ?" : "Sign Out of CrewHive"}
        description={
          isMl
            ? "നിങ്ങളുടെ അക്കൗണ്ടിൽ നിന്ന് സൈൻ ഔട്ട് ചെയ്യാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? തിരികെ പ്രവേശിക്കാൻ ഒ.ടി.പി ആവശ്യമാണ്."
            : "Are you sure you want to sign out of your account? You will need to verify with your phone number and OTP to sign back in."
        }
      />
    </>
  );
};

export default Header;
