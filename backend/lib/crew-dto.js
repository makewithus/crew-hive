/** Output filtering: what each audience may see of a crew document. */
const isoNow = () => new Date().toISOString();

export function isCurrentlyAvailable(c, now = isoNow()) {
  if (!c.available) return false;
  const exp = c.availableExpiresAt || c.availableUntil;
  return !(exp && exp < now);
}

const rateIsPublic = (c) => (c.rateVisible === true || c.rateVisibility === "public") && c.ratePerDay != null && c.ratePerDay !== "";

/** Public/recruiter view: no phone, no coordinates, no consent records, no private rate. */
export function publicCrew(c) {
  return {
    id: c.id,
    name: c.name || "Crew Member",
    role: c.role || null,
    roles: c.roles || (c.role ? [c.role] : []),
    specialisations: c.specialisations || [],
    city: c.city || null,
    district: c.district || null,
    experience: c.experience || null,
    languages: c.languages || [],
    bio: c.bio || null,
    profileImage: c.profileImage || null,
    portfolioLinks: c.portfolioLinks || {},
    pastCredits: c.pastCredits || [],
    equipmentOwned: c.equipmentOwned || [],
    travelWillingness: c.travelWillingness || null,
    available: isCurrentlyAvailable(c),
    availableExpiresAt: isCurrentlyAvailable(c) ? c.availableExpiresAt || c.availableUntil || null : null,
    locationLabel: c.coarseLocation?.city || c.city || null,
    ratePerDay: rateIsPublic(c) ? Number(c.ratePerDay) : null,
    rateVisible: rateIsPublic(c),
    association: c.associationMembership?.verified || c.isAssociationVerified ? { name: c.associationMembership?.name || c.associationName || null, verified: true } : null,
    createdAt: c.createdAt || null,
  };
}

/** Owner/admin view: everything except nothing is hidden, but internal consent blobs are kept for the owner only. */
export const ownerCrew = (c) => ({ ...c });
