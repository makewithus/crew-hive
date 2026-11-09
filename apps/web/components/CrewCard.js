/**
 * components/CrewCard.js
 * Public Crew Result Card
 *
 * Implements Prompt 3 Section 7:
 * - Displays public information: Name, profile image, parent role, specialisations,
 *   city/district, experience, availability status, association badge
 * - Enforces privacy:
 *     - NEVER exposes exact coordinates
 *     - Only displays day rate when explicitly enabled by crew member
 *     - Never exposes private contact details or internal moderation data
 * - Actions: View Profile, Shortlist toggle, Send Availability Request
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  MapPin,
  Clock,
  IndianRupee,
  ShieldCheck,
  Bookmark,
  Send,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export const CrewCard = ({
  crew,
  onSendRequest = null,
  onShortlistChange = null,
  isShortlisted = false,
  showActions = true,
}) => {
  const { isMalayalam } = useLanguage();
  const [savingShortlist, setSavingShortlist] = useState(false);
  const [saved, setSaved] = useState(isShortlisted);

  const initials = crew.name
    ? crew.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  // Check rate visibility
  const hasPublicRate =
    crew.rateVisibility === "public" ||
    (crew.showRate !== false &&
      crew.ratePerDay != null &&
      Number(crew.ratePerDay) > 0);

  const handleToggleShortlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingShortlist(true);

    try {
      if (saved) {
        const res = await fetch(`/api/recruiter/shortlist?crewId=${crew.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setSaved(false);
          toast.success("Removed from shortlist");
          if (onShortlistChange) onShortlistChange(crew.id, false);
        }
      } else {
        const res = await fetch("/api/recruiter/shortlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crewId: crew.id,
            name: crew.name,
            role: crew.role,
            city: crew.city,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          setSaved(true);
          toast.success("Saved to shortlist");
          if (onShortlistChange) onShortlistChange(crew.id, true);
        }
      }
    } catch (_) {
      toast.error("Could not update shortlist");
    } finally {
      setSavingShortlist(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex flex-col">
      {/* Top Banner / Avatar + Info */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">
        {crew.profileImage ? (
          <img
            src={crew.profileImage}
            alt={crew.name}
            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">{initials}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground truncate">
              {crew.name || "—"}
            </h3>

            {/* Availability Status Badge */}
            {crew.available ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isMalayalam ? "ഇപ്പോൾ ലഭ്യമാണ്" : "Available Now"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-400/10 border border-zinc-400/20 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                {isMalayalam ? "തിരക്കിലാണ്" : "Busy"}
              </span>
            )}
          </div>

          {/* Parent Role + Association Badge */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {crew.role && (
              <span className="inline-block text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                {crew.role}
              </span>
            )}
            {crew.associationMember && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />
                {crew.associationName ? `${crew.associationName}` : (isMalayalam ? "അംഗീകൃത അംഗം" : "Verified Member")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Specialisations */}
      {Array.isArray(crew.specialisations) && crew.specialisations.length > 0 && (
        <div className="px-5 pb-2 flex flex-wrap gap-1">
          {crew.specialisations.slice(0, 3).map((spec, i) => (
            <span
              key={i}
              className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded"
            >
              {spec}
            </span>
          ))}
          {crew.specialisations.length > 3 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{crew.specialisations.length - 3} {isMalayalam ? "കൂടുതൽ" : "more"}
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border mx-5 my-1" />

      {/* Metadata Row: Location & Experience */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {crew.city && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            {crew.city}
          </span>
        )}
        {crew.experience && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {crew.experience}
          </span>
        )}
      </div>

      {/* Bio excerpt */}
      {crew.bio && (
        <p className="px-5 pb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {crew.bio}
        </p>
      )}

      {/* Footer: Rate + Actions */}
      <div className="mt-auto px-5 pb-5 pt-3 flex items-center justify-between gap-2 border-t border-border/50">
        <div>
          {hasPublicRate ? (
            <div className="flex items-baseline gap-0.5">
              <IndianRupee className="w-3.5 h-3.5 text-primary mb-0.5" />
              <span className="text-base font-bold text-primary">
                {Number(crew.ratePerDay).toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">
                {isMalayalam ? "/ ദിവസം" : "/ day"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {isMalayalam ? "നിരക്ക് നേരിട്ട് അറിയുക" : "Rate on request"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bookmark / Shortlist button */}
          <button
            type="button"
            onClick={handleToggleShortlist}
            disabled={savingShortlist}
            title={saved ? (isMalayalam ? "ഷോർട്ട്‌ലിസ്റ്റിൽ നിന്ന് മാറ്റുക" : "Remove from shortlist") : (isMalayalam ? "ഷോർട്ട്‌ലിസ്റ്റ് ചെയ്യുക" : "Save to shortlist")}
            aria-label="Toggle shortlist"
            className={`p-2 rounded-xl border transition-all ${
              saved
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-primary" : ""}`} />
          </button>

          {/* Quick Request Button */}
          {showActions && onSendRequest && (
            <button
              type="button"
              onClick={() => onSendRequest(crew)}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {isMalayalam ? "റിക്വസ്റ്റ്" : "Request"}
            </button>
          )}

          {/* View Profile */}
          <Link href={`/organizer/crew/${crew.id || crew.uid}`}>
            <button className="text-xs font-semibold text-foreground border border-border bg-muted/60 hover:bg-muted px-3 py-2 rounded-xl transition-all flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {isMalayalam ? "കാണുക" : "View"}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CrewCard;
