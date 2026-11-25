"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";
import { toast } from "sonner";

export default function LanguageToggle({ className = "", compact = false }) {
  const { locale, setLocale } = useLanguage();

  const handleSelect = (lang) => {
    if (lang === locale) return;
    setLocale(lang);
    toast.success(
      lang === "ml"
        ? "ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി"
        : "Language switched to English"
    );
  };

  return (
    <div
      className={`inline-flex items-center h-9 rounded-xl bg-card/90 border border-border p-1 text-xs shadow-xs shrink-0 select-none whitespace-nowrap ${className}`}
      role="group"
      aria-label="Language selection"
    >
      {!compact && (
        <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1.5 mr-1 shrink-0" />
      )}
      <button
        type="button"
        onClick={() => handleSelect("en")}
        className={`h-7 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
          locale === "en"
            ? "bg-primary text-zinc-950 shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Switch to English"
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleSelect("ml")}
        className={`h-7 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
          locale === "ml"
            ? "bg-primary text-zinc-950 shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Switch to Malayalam"
        aria-pressed={locale === "ml"}
      >
        മലയാളം
      </button>
    </div>
  );
}
