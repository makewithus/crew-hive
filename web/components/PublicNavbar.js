"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import {
  Menu,
  X,
  LogIn,
  ChevronRight,
} from "lucide-react";

export default function PublicNavbar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/", label: t("common.nav.home", "Home") },
    { href: "/#how-it-works", label: t("common.nav.howItWorks", "How It Works") },
    { href: "/#categories", label: t("common.nav.categories", "Categories") },
    { href: "/#for-associations", label: t("common.nav.associations", "For Associations") },
    { href: "/contact", label: t("common.nav.contact", "Contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl transition-colors w-full">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-16 sm:h-17 flex items-center justify-between gap-3 sm:gap-4 w-full">
        {/* ── 1. Brand Logo (Left) ── */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-xl"
          aria-label="CrewHive Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#F5A623] to-[#DF9115] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(245,166,35,0.3)] group-hover:brightness-105 transition-all">
            <span className="text-zinc-950 font-black text-sm tracking-tight">
              C
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors leading-tight">
              CrewHive
            </span>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-400 hidden min-[440px]:inline-block leading-tight">
              Kerala AV Network
            </span>
          </div>
        </Link>

        {/* ── 2. Navigation Links (Optically Centered) ── */}
        <nav
          className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 px-4 max-w-2xl mx-auto"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all ${
                  isActive
                    ? "text-amber-400 font-semibold bg-zinc-900 border border-zinc-800/80 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── 3. Desktop & Tablet Action Group (Right) ── */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0">
          <LanguageToggle compact={false} />

          {/* Sign In Button */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 h-9 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold px-3 rounded-lg transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] whitespace-nowrap shrink-0 group"
          >
            <LogIn className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
            <span>{t("common.nav.signIn", "Sign In")}</span>
          </Link>

          {/* Menu button for tablet viewports (< lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("common.nav.closeMenu", "Close menu") : t("common.nav.menu", "Open menu")}
            className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer ml-0.5"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-amber-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ── 4. Mobile Controls (< sm) ── */}
        <div className="flex sm:hidden items-center gap-1.5">
          <LanguageToggle compact />

          {/* Mobile Sign In button */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1 h-9 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold px-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t("common.nav.signIn", "Sign In")}</span>
          </Link>

          {/* Accessible Mobile Toggle Button (≥44x44px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("common.nav.closeMenu", "Close menu") : t("common.nav.menu", "Open menu")}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-amber-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── 5. Mobile & Tablet Drawer Menu (< lg) ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150 max-h-[calc(100dvh-4.25rem)] overflow-y-auto overscroll-contain shadow-2xl">
          <nav className="space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                    isActive
                      ? "text-amber-400 font-semibold bg-zinc-900 border border-zinc-800/80"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-900/60"
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-zinc-800">
            {/* Full-Width Sign In Button in Mobile Drawer */}
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900/80 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-850 font-semibold text-sm py-3 px-4 rounded-xl min-h-[44px] transition-colors"
            >
              <LogIn className="w-4 h-4 text-zinc-400" />
              <span>{t("common.nav.signIn", "Sign In")}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
