import React from "react";

/**
 * Bespoke Audio-Visual & Live Events Iconography for CrewHive
 * Designed with authentic pro-hardware geometry, precise stroke weights, and studio aesthetic.
 */

/**
 * 3-Channel Studio Console Fader
 * Represents pro audio mixers, lighting consoles, and technical crew desks.
 */
export function ConsoleFaderIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Channel 1 Track & Cap */}
      <line x1="5" y1="3" x2="5" y2="21" strokeWidth="1.75" />
      <rect x="2.75" y="7" width="4.5" height="4" rx="1" fill="currentColor" stroke="none" />

      {/* Channel 2 Track & Cap */}
      <line x1="12" y1="3" x2="12" y2="21" strokeWidth="1.75" />
      <rect x="9.75" y="13" width="4.5" height="4" rx="1" fill="currentColor" stroke="none" />

      {/* Channel 3 Track & Cap */}
      <line x1="19" y1="3" x2="19" y2="21" strokeWidth="1.75" />
      <rect x="16.75" y="5" width="4.5" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Film & Event Production Clapperboard Slate
 * Represents production houses, event directors, shoot coordinators, and showrunners.
 */
export function ProductionClapperIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Slate body */}
      <rect x="3" y="10" width="18" height="11" rx="1.5" />
      {/* Hinge & top clapper bar */}
      <path d="M3 10h18" />
      <path d="m6.5 10 2.5-6.5h3L9.5 10" fill="currentColor" fillOpacity="0.25" />
      <path d="m12.5 10 2.5-6.5h3L15.5 10" fill="currentColor" fillOpacity="0.25" />
      <path d="M3 3.5h18" />
      {/* Subtle calibration / field markers on the slate */}
      <circle cx="5" cy="5.5" r="0.75" fill="currentColor" />
      <line x1="7" y1="14.5" x2="12" y2="14.5" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="14" y1="14.5" x2="17" y2="14.5" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="7" y1="17.5" x2="17" y2="17.5" strokeWidth="1.4" strokeOpacity="0.7" />
    </svg>
  );
}

/**
 * Authentic Official WhatsApp Brand Mark
 */
export function WhatsAppBrandIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Stage Lighting Fixture / PAR Can Icon
 */
export function StageLightIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2v4" />
      <path d="m8 6 8 0" strokeWidth="2" />
      <path d="M7 6l2 7h6l2-7" />
      <ellipse cx="12" cy="13" rx="3" ry="1.5" />
      <path d="m6 18 2-3" />
      <path d="m18 18-2-3" />
      <path d="M12 15v5" />
      <circle cx="12" cy="21" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Stage Rigging Truss Icon
 */
export function RiggingTrussIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <line x1="3" y1="6" x2="9" y2="18" />
      <line x1="9" y1="6" x2="15" y2="18" />
      <line x1="15" y1="6" x2="21" y2="18" />
      <line x1="9" y1="18" x2="15" y2="6" />
      <line x1="15" y1="18" x2="21" y2="6" />
      <line x1="3" y1="18" x2="9" y2="6" />
    </svg>
  );
}

