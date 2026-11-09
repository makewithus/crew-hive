"use client";

import { useEffect } from "react";
import { LogOut, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
  title,
  description,
}) {
  const { t } = useLanguage();

  const resolvedTitle = title || t("logoutModal.title", "Sign Out of CrewHive");
  const resolvedDesc =
    description ||
    t(
      "logoutModal.description",
      "Are you sure you want to sign out? You will need to verify your phone number via OTP to sign back in."
    );
  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoggingOut]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!isLoggingOut) onClose();
        }}
      />

      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3
            id="logout-modal-title"
            className="text-lg font-bold text-foreground"
          >
            {resolvedTitle}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {resolvedDesc}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {t("logoutModal.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t("logoutModal.loggingOut", "Signing out...")}</span>
              </>
            ) : (
              <span>{t("logoutModal.confirm", "Sign Out")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
