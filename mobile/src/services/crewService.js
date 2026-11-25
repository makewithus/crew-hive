import { api } from "./api.js";
import { crewToView, bookingToView, consentBody, profilePatch } from "./mappers.js";

class MobileCrewService {
  async onboard(p) {
    const role = p.primaryRole || p.role;
    const d = await api.post("/crew/onboard", { name: p.name, role, roles: p.roles?.length ? p.roles : [role], city: p.city, consent: consentBody(p.consentVersion) });
    return { ...d, crew: crewToView(d.crew) };
  }
  async getMyProfile() { return crewToView(await api.get("/crew/me", { cache: true })); }
  async updateProfile(u) { return crewToView(await api.patch("/crew/me", profilePatch(u))); }
  getAvailability() { return api.get("/crew/me/availability"); }
  /** targetState true needs {coarseCity, coarseLat?, coarseLng?}; location consent is recorded server-side with the request. */
  toggleAvailability({ availableNow, coarseLat, coarseLng, coarseCity }) {
    return api.put("/crew/me/availability", { available: !!availableNow, ...(availableNow ? { coarseCity, consentGranted: true, ...(coarseLat != null ? { coarseCoords: { lat: coarseLat, lng: coarseLng } } : {}) } : {}) });
  }
  withdrawLocationConsent() { return api.post("/crew/me/location-consent/withdraw", {}); }
  async getIncomingRequests() {
    const d = await api.get("/crew/me/requests", { cache: true });
    const items = (d.items || []).map(bookingToView);
    items.shouldPromptAvailabilityReview = Boolean(d.shouldPromptAvailabilityReview);
    items.missedOrDeclinedCount = d.missedOrDeclinedCount || 0;
    return items;
  }
  respondToRequest(bookingId, response) {
    const r = response === "YES" || response === "accepted" ? "accepted" : "declined";
    return api.post(`/crew/me/requests/${bookingId}/respond`, { response: r });
  }
}
export const crewService = new MobileCrewService();
export default crewService;
