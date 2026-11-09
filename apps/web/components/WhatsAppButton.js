"use client";

import { useLanguage } from "@/context/LanguageContext";
import { getWhatsAppUrl, isWhatsAppConfigured } from "@/lib/whatsapp-config";
import { WhatsAppBrandIcon } from "@/components/icons/AvIcons";
import { ArrowUpRight, AlertCircle } from "lucide-react";

export default function WhatsAppButton({
  variant = "primary", // "primary" | "secondary" | "outline" | "compact"
  text = null,
  message = "Hi",
  className = "",
}) {
  const { t } = useLanguage();
  const configured = isWhatsAppConfigured();
  const whatsappUrl = getWhatsAppUrl(message);
  const buttonText = text || t("common.whatsapp.button", "Sign up via WhatsApp");

  if (!configured) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium cursor-not-allowed ${className}`}
        title={t("common.whatsapp.notConfigured", "WhatsApp onboarding contact is currently updating.")}
      >
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{t("common.whatsapp.notConfigured", "WhatsApp onboarding updating")}</span>
      </div>
    );
  }

  const baseStyles =
    "inline-flex items-center justify-center gap-2.5 font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer text-center active:scale-[0.98] min-h-[44px]";

  let variantStyles = "";
  if (variant === "primary") {
    variantStyles =
      "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-4 sm:px-5 py-3 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(0,0,0,0.4),0_6px_16px_rgba(5,150,105,0.25)] text-sm";
  } else if (variant === "secondary") {
    // Pro Audio/Video Studio Channel Style: Dark graphite chassis with authentic WhatsApp #25D366 brand green accent
    variantStyles =
      "bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 hover:bg-zinc-800/90 text-zinc-100 hover:text-white border border-zinc-700/80 hover:border-emerald-500/50 px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.5)]";
  } else if (variant === "outline") {
    variantStyles =
      "bg-zinc-900/80 hover:bg-emerald-950/20 text-zinc-300 hover:text-emerald-300 border border-zinc-800 hover:border-emerald-500/40 px-3 sm:px-4 py-2.5 rounded-xl text-xs";
  } else if (variant === "compact") {
    variantStyles =
      "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs min-h-[36px]";
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${buttonText} (opens official WhatsApp in a new window)`}
      className={`${baseStyles} ${variantStyles} ${className} group`}
    >
      <WhatsAppBrandIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#25D366] group-hover:scale-105 transition-transform" />
      <span className="tracking-tight">{buttonText}</span>
      <ArrowUpRight className="w-4 h-4 text-emerald-400/70 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
    </a>
  );
}
