"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import {
  ConsoleFaderIcon,
  ProductionClapperIcon,
  WhatsAppBrandIcon,
} from "@/components/icons/AvIcons";
import {
  Menu,
  X,
  LogIn,
  ChevronRight,
} from "lucide-react";
import { getWhatsAppUrl, isWhatsAppConfigured } from "@/lib/whatsapp-config";

export default function PublicNavbar({ onOpenSignUp = null }) {
  const { t, isMalayalam } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const whatsappConfigured = isWhatsAppConfigured();
  const whatsappUrl = getWhatsAppUrl("Hi");

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

  const handleCrewClick = (e) => {
    if (onOpenSignUp) {
      e.preventDefault();
      onOpenSignUp("crew");
      setMobileMenuOpen(false);
    }
  };

  const handleRecruiterClick = (e) => {
    if (onOpenSignUp) {
      e.preventDefault();
      onOpenSignUp("organizer");
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl transition-colors w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 h-17 flex items-center justify-between gap-2 lg:gap-3 w-full">
        {/* Brand Logo */}
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
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              CrewHive
            </span>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-400 hidden min-[440px]:inline-block">
              Kerala AV Network
            </span>
          </div>
        </Link>

        {/* Center Nav Links - Shown on xl+ viewports (>=1280px) to guarantee zero overflow */}
        <nav
          className="hidden xl:flex items-center gap-1 2xl:gap-2.5 shrink min-w-0"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs 2xl:text-sm font-medium transition-all ${
                  isActive
                    ? "text-amber-400 font-semibold bg-zinc-900"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Buttons & Language Switcher */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
          <LanguageToggle compact={false} />

          {/* Primary CTA: Crew (Responsive text adapting to Malayalam) */}
          <button
            onClick={handleCrewClick}
            type="button"
            className="inline-flex items-center gap-1.5 lg:gap-2 bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-xs xl:text-xs 2xl:text-sm px-2.5 sm:px-3 xl:px-3.5 py-2 rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(245,166,35,0.3)] cursor-pointer whitespace-nowrap shrink-0 leading-tight"
          >
            <ConsoleFaderIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isMalayalam ? (
                <>
                  <span className="hidden 2xl:inline">{t("common.nav.createProfile", "സൗജന്യ പ്രൊഫൈൽ നിർമ്മിക്കുക")}</span>
                  <span className="2xl:hidden">{t("common.nav.createProfileShort", "സൗജന്യ പ്രൊഫൈൽ")}</span>
                </>
              ) : (
                t("common.nav.createProfile", "Create free profile")
              )}
            </span>
          </button>

          {/* Secondary CTA: Hiring Crew (Shown on xl+ viewports) */}
          <button
            onClick={handleRecruiterClick}
            type="button"
            className="hidden xl:inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-zinc-200 hover:text-white text-xs font-semibold px-2.5 xl:px-3 py-2 rounded-lg transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer whitespace-nowrap shrink-0 leading-tight"
          >
            <ProductionClapperIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {isMalayalam ? (
                <>
                  <span className="hidden 2xl:inline">{t("common.nav.hiringCrew", "ക്രൂവിനെ ആവശ്യമുണ്ട്")}</span>
                  <span className="2xl:hidden">{t("common.nav.hiringCrewShort", "ക്രൂവിനെ വേണം")}</span>
                </>
              ) : (
                t("common.nav.hiringCrew", "I'm hiring crew")
              )}
            </span>
          </button>

          {/* Sign In Link (Always visible, securely padded, never clipped) */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 font-medium px-2 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t("common.nav.signIn", "Sign In")}</span>
          </Link>

          {/* Hamburger toggle for Tablet/Laptop viewports (md to xl) where center nav is in drawer */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("common.nav.closeMenu", "Close menu") : t("common.nav.menu", "Open menu")}
            className="xl:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer ml-1"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-amber-400" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mobile controls (< md) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
          <LanguageToggle compact />
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

      {/* Mobile / Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150 max-h-[calc(100dvh-4.25rem)] overflow-y-auto overscroll-contain">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors min-h-[44px]"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-zinc-800 space-y-2.5">
            <button
              onClick={handleCrewClick}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-amber-500/20 min-h-[44px]"
            >
              <ConsoleFaderIcon className="w-4 h-4 shrink-0" />
              <span>{t("common.nav.createProfile", "Create free profile")}</span>
            </button>

            <button
              onClick={handleRecruiterClick}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-700/80 text-zinc-200 font-semibold text-sm py-3 px-4 rounded-xl hover:bg-zinc-800 min-h-[44px]"
            >
              <ProductionClapperIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t("common.nav.hiringCrew", "I'm hiring crew")}</span>
            </button>

            {whatsappConfigured && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-700/80 text-zinc-200 font-semibold text-sm py-3 px-4 rounded-xl hover:border-emerald-500/50 min-h-[44px]"
              >
                <WhatsAppBrandIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>{t("common.whatsapp.button", "Sign up via WhatsApp")}</span>
              </a>
            )}

            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white py-2.5 min-h-[40px]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("common.nav.signIn", "Sign In")}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
