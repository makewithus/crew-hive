"use client";

import { formatCurrency } from "@/utils/formatting";
import Link from "next/link";
import { MapPin, Clock, MoveRight, IndianRupee } from "lucide-react";

export const CrewCard = ({
  crew,
  onActionClick = null,
  actionLabel = null,
  showActions = false,
}) => {
  const initials = crew.name
    ? crew.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex flex-col">
      {/* Header strip with avatar + name + role */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-4">
        {crew.profileImage ? (
          <img
            src={crew.profileImage}
            alt={crew.name}
            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">{initials}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground truncate">
              {crew.name || "—"}
            </h3>
            {crew.available ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/25 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Busy
              </span>
            )}
          </div>
          {crew.role && (
            <span className="inline-block mt-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
              {crew.role}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-5" />

      {/* Meta row */}
      <div className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-2">
        {crew.city && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {crew.city}
          </span>
        )}
        {crew.experience && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {crew.experience}
          </span>
        )}
        {crew.travelRange && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MoveRight className="w-3.5 h-3.5 shrink-0" />
            {crew.travelRange} km range
          </span>
        )}
      </div>

      {/* Bio */}
      {crew.bio && (
        <p className="px-5 pb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {crew.bio}
        </p>
      )}

      {/* Footer: rate + action */}
      <div className="mt-auto px-5 pb-5 pt-3 flex items-center justify-between gap-3">
        {crew.ratePerDay ? (
          <div className="flex items-baseline gap-0.5">
            <IndianRupee className="w-3.5 h-3.5 text-primary mb-0.5" />
            <span className="text-lg font-bold text-primary">
              {Number(crew.ratePerDay).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted-foreground ml-1">/ day</span>
          </div>
        ) : (
          <span />
        )}

        <Link href={`/organizer/crew/${crew.id || crew.uid}`}>
          <button className="text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl transition-all">
            View Profile
          </button>
        </Link>

        {showActions && actionLabel && onActionClick && (
          <button
            onClick={() => onActionClick(crew)}
            className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl transition-all"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default CrewCard;
