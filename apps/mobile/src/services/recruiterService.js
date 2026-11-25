import { api } from "./api.js";
import { crewToView, requestToView, createRequestBody, consentBody } from "./mappers.js";

class MobileRecruiterService {
  onboard(p) { return api.post("/recruiters/onboard", { name: p.name, companyName: p.companyName, city: p.city, consent: consentBody(p.consentVersion) }); }
  getMyProfile() { return api.get("/recruiters/me", { cache: true }); }
  async getMySentRequests() { const d = await api.get("/requests", { cache: true }); return (d.items || []).map(requestToView); }
  getSentRequests() { return this.getMySentRequests(); }
  async getRequestDetail(id) { return requestToView(await api.get(`/requests/${id}`)); }
  async createRequest(p) { return api.post("/requests", createRequestBody(p)); }
  async searchCrew(f = {}) {
    const params = {};
    if (f.role) params.role = f.role;
    if (f.specialisation) params.specialisation = f.specialisation;
    if (f.city) params.city = f.city;
    if (f.availableNow || f.availableOnly) params.available = "true";
    if (f.language) params.language = Array.isArray(f.language) ? f.language.join(",") : f.language;
    if (f.experience) params.experience = f.experience;
    if (f.minRate) params.minRate = f.minRate;
    if (f.maxRate) params.maxRate = f.maxRate;
    if (f.limit) params.limit = f.limit;
    if (f.page) params.page = f.page;
    const d = await api.get("/crew", { params, cache: true });
    return (d.items || []).map(crewToView);
  }
  async getCrewDetail(id) { return crewToView(await api.get(`/crew/${id}`, { cache: true })); }
  getCrewContact(id) { return api.get(`/crew/${id}/contact`); }
  getFeatures() { return api.get("/features", { auth: true }); }
  async getShortlists() { const d = await api.get("/recruiters/me/shortlist", { cache: true }); return (d.items || []).map(crewToView); }
  getShortlist() { return this.getShortlists(); }
  addToShortlist(crewOrId) { return api.put(`/recruiters/me/shortlist/${typeof crewOrId === "object" ? crewOrId.id : crewOrId}`, {}); }
  removeFromShortlist(id) { return api.delete(`/recruiters/me/shortlist/${id}`); }
  async getShows(showId) { return api.get("/recruiters/me/shows", { params: showId ? { showId } : {} }); }
  saveShow(data) { return api.post("/recruiters/me/shows", data); }
  deleteShow(id) { return api.delete(`/recruiters/me/shows/${id}`); }
  createPrebooking(data) { return api.post("/prebookings", data); }
  getPrebookings() { return api.get("/prebookings"); }
  updatePrebookingStatus(id, status) { return api.patch(`/prebookings/${id}/status`, { status }); }
  reportProfile(id, reason, details) { return api.post("/reports", { reportedProfileId: id, reason, details }); }
  blockProfile(id) { return api.put(`/blocks/${id}`, {}); }
}
export const recruiterService = new MobileRecruiterService();
export default recruiterService;
