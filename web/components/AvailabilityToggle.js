"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { CITIES } from "@/utils/taxonomy";
import { toast } from "sonner";
import {
  MapPin,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Compass,
  ChevronDown,
} from "lucide-react";

export default function AvailabilityToggle({
  phone,
  isAvailable = false,
  isAutoExpired = false,
  availableExpiresAt = null,
  currentCity = "Kochi",
  onChange,
  disabled = false,
  loading = false,
}) {
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const [modalOpen, setModalOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [selectedCity, setSelectedCity] = useState(currentCity || "Kochi");
  const [coarseCoords, setCoarseCoords] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Lock body scroll when modal is open to prevent background movement
  useEffect(() => {
    if (modalOpen) {
      const origHtmlOverflow = document.documentElement.style.overflow;
      const origBodyOverflow = document.body.style.overflow;
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return () => {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [modalOpen]);

  // When user clicks the toggle
  const handleToggleClick = () => {
    if (disabled || loading) return;

    if (!isAvailable || isAutoExpired) {
      // User is turning availability ON: Open modal to explain location and request permission
      setLocError("");
      setPermissionDenied(false);
      setModalOpen(true);
    } else {
      // User is turning availability OFF: directly update backend
      handleConfirmOff();
    }
  };

  // Turn Availability OFF
  const handleConfirmOff = async () => {
    try {
      const res = await apiFetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          available: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.info(
          isMl
            ? "ലഭ്യത ഓഫാക്കി. പുതിയ റിക്വസ്റ്റുകൾ ലഭിക്കില്ല."
            : "Availability turned OFF. You will not receive new pings."
        );
        onChange?.({
          available: false,
          autoExpired: false,
          availableExpiresAt: null,
        });
      } else {
        toast.error("Failed to update availability");
      }
    } catch (err) {
      console.error("[AvailabilityToggle] Turn OFF error:", err);
      toast.error(err.message || "Failed to update availability");
    }
  };

  // Request Coarse GPS Location
  const handleRequestGps = () => {
    setLocLoading(true);
    setLocError("");
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setPermissionDenied(true);
      setLocError(
        isMl
          ? "ബ്രൗസറിൽ ജി.പി.എസ് ലഭ്യമല്ല. താഴെ നിന്ന് നഗരം തിരഞ്ഞെടുക്കുക."
          : "Geolocation is not supported by your browser. Please select your city manually."
      );
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Enforce coarse location: round to 2 decimal places (~1.1 km)
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        setCoarseCoords({ lat, lng });
        setLocLoading(false);
      },
      (err) => {
        console.warn("[AvailabilityToggle] Geolocation declined/error:", err.message);
        setPermissionDenied(true);
        setLocLoading(false);
        setLocError(
          isMl
            ? "ലൊക്കേഷൻ അനുമതി നൽകിയില്ല. താഴെ നിന്ന് നിങ്ങളുടെ നഗരം തിരഞ്ഞെടുക്കുക."
            : "Location permission denied. Please choose your working city manually."
        );
      },
      {
        enableHighAccuracy: false, // COARSE location only
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  // Turn Availability ON (confirm submit)
  const handleConfirmOn = async () => {
    setLocLoading(true);
    setLocError("");

    try {
      const res = await apiFetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          available: true,
          coarseCity: selectedCity,
          coarseCoords,
          consentGranted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update availability.");
      }

      setModalOpen(false);
      toast.success(
        isMl
          ? "ലഭ്യത ഓണാക്കി! അടുത്ത 18 മണിക്കൂർ സജീവം."
          : `Availability turned ON! Active for 18 hours in ${selectedCity}.`
      );
      onChange?.({
        available: true,
        autoExpired: false,
        availableExpiresAt: data.availableExpiresAt,
        coarseCity: selectedCity,
      });
    } catch (err) {
      setLocError(err.message || "Failed to set availability.");
      toast.error(err.message || "Failed to set availability.");
    } finally {
      setLocLoading(false);
    }
  };

  // Format expiry date
  const formatExpiry = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(isMl ? "ml-IN" : "en-IN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
              isAvailable
                ? "bg-green-500 shadow-md shadow-green-500/30 animate-pulse"
                : isAutoExpired
                ? "bg-amber-500 shadow-md shadow-amber-500/30"
                : "bg-red-500/80"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {isAvailable
                  ? t("dashboard.available", "Available for Work")
                  : isAutoExpired
                  ? t("dashboard.autoExpired", "Availability Auto-Expired")
                  : t("dashboard.busy", "Busy / Unavailable")}
              </span>

              {isAutoExpired && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {isMl ? "കാലാവധി കഴിഞ്ഞു" : "Expired"}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {isAvailable && availableExpiresAt ? (
                <span>
                  {t("dashboard.expiresOn", "Available until")}{" "}
                  <strong className="text-foreground">{formatExpiry(availableExpiresAt)}</strong> (7 days)
                </span>
              ) : isAutoExpired ? (
                <span>{t("dashboard.autoExpiredNotice", "Reconfirm to appear in recruiter searches.")}</span>
              ) : (
                <span>{isMl ? "റിക്രൂട്ടർ സെർച്ചുകളിൽ പ്രൊഫൈൽ കാണില്ല." : "Profile hidden from direct searches."}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Toggle or Reconfirm Button */}
        <div className="flex items-center gap-3 shrink-0">
          {isAutoExpired && (
            <button
              type="button"
              onClick={handleToggleClick}
              disabled={disabled || loading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t("dashboard.reconfirmAvailability", "Reconfirm (7 Days)")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleClick}
            disabled={disabled || loading}
            aria-label="Toggle availability"
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
              isAvailable
                ? "bg-emerald-500 hover:bg-emerald-400 shadow-xs shadow-emerald-500/20"
                : "bg-zinc-800 border border-zinc-700 hover:border-zinc-500"
            } ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                isAvailable ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ─── LOCATION CONSENT & EXPLANATION MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {t("availability.modalTitle", "Turn On Availability")}
                  </h3>
                  <p className="text-xs text-muted-foreground">7-Day Search Eligibility</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Privacy Explanation */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Lock className="w-4 h-4 text-green-400" />
                <span>{t("availability.whyLocationTitle", "Why Location is Needed")}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "availability.whyLocationDesc",
                  "CrewHive matches you with nearby events in Kerala based on coarse city-level location. We never track your continuous trail, nor share your exact coordinates."
                )}
              </p>
              <div className="pt-1 flex items-center gap-1 text-[11px] text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t("availability.coarsePrivacyNote", "Strict privacy: Coarse city-level only.")}</span>
              </div>
            </div>

            {/* Error or Denied notice */}
            {locError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="flex-1">{locError}</span>
              </div>
            )}

            {/* Action 1: GPS Permission Request */}
            <div>
              <button
                type="button"
                onClick={handleRequestGps}
                disabled={locLoading}
                className="w-full py-2.5 px-3.5 rounded-xl bg-muted border border-border hover:border-primary/60 text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-primary" />
                <span className="flex items-center gap-1.5">
                  {coarseCoords ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{isMl ? "ഏകദേശ ലൊക്കേഷൻ കണ്ടെത്തി" : "Coarse Coordinates Obtained"}</span>
                    </>
                  ) : (
                    <span>{t("availability.requestGps", "Use My Current Coarse Location")}</span>
                  )}
                </span>
              </button>
            </div>

            {/* Action 2: Manual City Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("availability.manualCityLabel", "Confirm Current Working City")}
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setLocError("");
                  }}
                  className="w-full appearance-none bg-muted/90 border border-border text-foreground rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium outline-none focus:border-primary transition-all cursor-pointer hover:border-zinc-500"
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {isMl ? c.nameMl : c.nameEn} ({isMl ? c.nameEn : c.nameMl})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Expiry Note */}
            <p className="text-[11px] text-muted-foreground text-center">
              {isMl
                ? "ലഭ്യത 7 ദിവസത്തേക്ക് സജീവമായിരിക്കും. അതിനുശേഷം വീണ്ടും സ്ഥിരീകരിക്കാം."
                : "Availability stays active for 7 days unless reconfirmed or switched off."}
            </p>

            {/* Confirm Button */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
              >
                {t("common.cancel", "Cancel")}
              </button>

              <button
                type="button"
                onClick={handleConfirmOn}
                disabled={locLoading || !selectedCity}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t("availability.confirmAvailable", "Set Available for 7 Days")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
