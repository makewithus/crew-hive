/**
 * apps/mobile/src/services/mappers.js
 * Anti-corruption layer: canonical API DTOs (same as the website receives) → the view-models the existing screens render.
 * Contract changes happen here, in ONE place, not in 25 screens. No business rules live here.
 */

const roleLabel = (c) => c.role;

export function crewToView(c) {
  if (!c) return c;
  return {
    ...c,
    primaryRole: roleLabel(c),
    availableNow: !!c.available,
    availabilityExpiresAt: c.availableExpiresAt || null,
    coarseCity: c.locationLabel || c.coarseLocation?.city || c.coarseCity || c.city,
    dayRate: c.ratePerDay ?? null,
    showDayRate: c.rateVisible === true,
    travelRadius: c.travelWillingness || null,
    associationCode: c.association?.name || null, // shown as "Verified Member"; only present when server-verified
    approved: c.status ? c.status === "approved" : c.approved,
  };
}

export const bookingToView = (b) => ({
  ...b,
  projectTitle: b.workType || "Availability request",
  recruiterName: b.recruiterName || "Recruiter",
  companyName: b.recruiterName,
  city: b.location, startDate: b.date, endDate: b.date, dates: b.date,
  myResponse: b.status === "accepted" ? "YES" : b.status === "declined" ? "NO" : null,
});

export const requestToView = (r) => ({
  ...r,
  projectTitle: r.workType || "Availability request",
  dates: r.date,
  candidates: (r.crewPings || []).map((p) => ({ ...p, response: p.status === "accepted" ? "YES" : p.status === "declined" ? "NO" : null })),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
export function createRequestBody(p) {
  const date = (p.startDate || "").trim();
  if (!ISO_DATE.test(date)) { const e = new Error("Enter the date as YYYY-MM-DD (e.g. 2027-02-14)"); e.apiMessage = e.message; throw e; }
  return { role: p.role, date, location: p.location, workType: p.workType || p.projectTitle || "Live Event", notes: [p.projectTitle && `Project: ${p.projectTitle}`, p.notes].filter(Boolean).join(" — ").slice(0, 500) || undefined, targetCrewIds: p.candidateIds };
}

export const consentBody = (version) => ({ version: version || "1.0", termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true });

/** Edit-profile screen fields → canonical profile patch. */
export function profilePatch(u) {
  const p = {};
  if (u.name !== undefined) p.name = u.name;
  if (u.bio !== undefined) p.bio = u.bio;
  if (u.profileImage !== undefined) p.profileImage = u.profileImage;
  if (u.experience !== undefined) p.experience = u.experience;
  if (u.dayRate !== undefined) p.ratePerDay = u.dayRate;
  if (u.showDayRate !== undefined) p.rateVisible = !!u.showDayRate;
  if (Array.isArray(u.languages)) p.languages = u.languages;
  if (Array.isArray(u.pastCredits)) p.pastCredits = u.pastCredits;
  if (Array.isArray(u.equipmentOwned)) p.equipmentOwned = u.equipmentOwned;
  if (u.travelRadius !== undefined) p.travelWillingness = ["local", "district", "kerala"].includes(u.travelRadius) ? u.travelRadius : /kerala/i.test(u.travelRadius) ? "kerala" : /district/i.test(u.travelRadius) ? "district" : "local";
  if (u.portfolioUrl !== undefined) {
    const url = String(u.portfolioUrl).trim();
    p.portfolioLinks = url ? { [/youtu/i.test(url) ? "youtube" : /drive\.google/i.test(url) ? "drive" : "instagram"]: url } : {};
  }
  return p;
}
