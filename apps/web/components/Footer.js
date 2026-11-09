"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { WhatsAppBrandIcon } from "@/components/icons/AvIcons";
import {
  Mail,
  Shield,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { getWhatsAppUrl, isWhatsAppConfigured } from "@/lib/whatsapp-config";

export default function Footer({ onOpenSignUp = null }) {
  const { t } = useLanguage();
  const whatsappConfigured = isWhatsAppConfigured();
  const whatsappUrl = getWhatsAppUrl("Hi");

  const handleCrewClick = (e) => {
    if (onOpenSignUp) {
      e.preventDefault();
      onOpenSignUp("crew");
    }
  };

  const handleRecruiterClick = (e) => {
    if (onOpenSignUp) {
      e.preventDefault();
      onOpenSignUp("organizer");
    }
  };

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-md relative z-10 text-muted-foreground">
      {/* Top Footer Banner */}
      <div className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <span className="text-primary-foreground font-black text-lg">C</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground tracking-tight block">
                CrewHive
              </span>
              <p className="text-xs text-muted-foreground">
                {t("footer.tagline", "Kerala's AV and events crew, in one place.")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t("footer.targetLaunch", "Target Launch: January 1, 2027")}</span>
            </span>
            <LanguageToggle compact />
          </div>
        </div>
      </div>

      {/* Main Link Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Col 1: Platform & Mission */}
        <div className="min-[480px]:col-span-2 md:col-span-1 space-y-3">
          <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
            CrewHive
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "footer.mission",
              "Connecting skilled audio-visual and event technicians with production houses, event managers, and agencies across Kerala."
            )}
          </p>
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground/80 leading-normal">
              {t(
                "footer.noInsuranceNote",
                "CrewHive is a professional talent directory and coordination platform. Direct contracts and bookings are managed between crew and recruiters."
              )}
            </p>
          </div>
        </div>

        {/* Col 2: For Crew */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
            {t("footer.forCrew", "For Crew")}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={handleCrewClick}
                type="button"
                className="py-1 inline-block hover:text-primary transition-colors text-left cursor-pointer min-h-[36px] sm:min-h-0 flex items-center"
              >
                {t("footer.createProfile", "Create Free Profile")}
              </button>
            </li>
            {whatsappConfigured && (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1 inline-block hover:text-primary transition-colors text-muted-foreground text-xs min-h-[36px] sm:min-h-0 flex items-center"
                >
                  {t("footer.joinWhatsApp", "Sign up via WhatsApp")}
                </a>
              </li>
            )}
            <li>
              <Link href="/auth/phone" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.signIn", "Sign In with Phone")}
              </Link>
            </li>
            <li>
              <Link href="/#categories" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.categories", "Professional Roles")}
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.howItWorks", "How It Works")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: For Recruiters & Associations */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
            {t("footer.forRecruiters", "For Recruiters")}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={handleRecruiterClick}
                type="button"
                className="py-1 inline-block hover:text-primary transition-colors text-left cursor-pointer min-h-[36px] sm:min-h-0 flex items-center"
              >
                {t("footer.hireCrew", "I'm Hiring Crew")}
              </button>
            </li>
            <li>
              <Link href="/#for-associations" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.associations", "For Associations")}
              </Link>
            </li>
            <li>
              <Link href="/#for-associations" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.associationInquiry", "Partnership Inquiry")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.contact", "Contact Support")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Legal & Policies */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
            {t("footer.legal", "Legal")}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/terms" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.terms", "Terms & Conditions")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.privacy", "Privacy Policy")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="py-1 inline-block hover:text-primary transition-colors min-h-[36px] sm:min-h-0 flex items-center">
                {t("footer.contact", "Contact Us")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left">
          <p className="text-muted-foreground">
            {t("footer.copyright", "© 2026–2027 CrewHive. All rights reserved.")}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="py-1 inline-block hover:text-foreground transition-colors">
              {t("footer.terms", "Terms")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="py-1 inline-block hover:text-foreground transition-colors">
              {t("footer.privacy", "Privacy")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/contact" className="py-1 inline-block hover:text-foreground transition-colors">
              {t("footer.contact", "Contact")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

