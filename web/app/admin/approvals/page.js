"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { formatDate, formatCurrency } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { toast } from "sonner";
import {
  Check,
  X,
  Search,
  ExternalLink,
  MapPin,
  Briefcase,
  IndianRupee,
  Compass,
  User,
} from "lucide-react";

export default function AdminApprovalsPage() {
  const { currentUser, isAdmin } = useAuth();
  const { t, isMalayalam } = useLanguage();

  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // "all" | "pending" | "approved" | "rejected"
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedCrew, setSelectedCrew] = useState(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedCrew) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [selectedCrew]);

  const fetchProfiles = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch("/api/admin/profiles?filter=all");
      const json = await res.json();
      if (json.success) {
        setCrews(json.data || []);
      } else {
        toast.error("Failed to load profiles: " + (json.error || "Unknown error"));
      }
    } catch (err) {
      console.error("[Approvals] fetchProfiles error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Real-time polling every 10s
  useEffect(() => {
    if (!currentUser) return;
    fetchProfiles();
    const interval = setInterval(fetchProfiles, 10000);
    return () => clearInterval(interval);
  }, [currentUser, fetchProfiles]);

  const handleApproval = async (crewId, approve, crewName = "Crew member") => {
    if (!crewId) {
      toast.error("Invalid crew ID");
      return;
    }
    setUpdatingId(crewId);

    try {
      const res = await apiFetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crewId,
          role: "crew",
          action: approve ? "approve" : "reject",
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Optimistic update
        setCrews((prev) =>
          prev.map((c) => {
            const id = c.id || c.uid || c.phone;
            if (id === crewId) {
              return {
                ...c,
                status: approve ? "approved" : "rejected",
                approved: approve,
              };
            }
            return c;
          })
        );

        if (selectedCrew && (selectedCrew.id || selectedCrew.phone) === crewId) {
          setSelectedCrew((prev) =>
            prev
              ? {
                  ...prev,
                  status: approve ? "approved" : "rejected",
                  approved: approve,
                }
              : null
          );
        }

        if (approve) {
          toast.success(
            isMalayalam
              ? `"${crewName}" പ്രൊഫൈൽ വിജയകരമായി അംഗീകരിച്ചു!`
              : `Profile for "${crewName}" approved successfully!`
          );
        } else {
          toast.error(
            isMalayalam
              ? `"${crewName}" പ്രൊഫൈൽ നിരസിച്ചു.`
              : `Profile for "${crewName}" has been rejected.`
          );
        }
      } else {
        toast.error(data.error || (isMalayalam ? "മാറ്റങ്ങൾ വരുത്താൻ കഴിഞ്ഞില്ല" : "Update failed"));
      }
    } catch (err) {
      console.error("[Approvals] handleApproval error:", err);
      toast.error(err.message || (isMalayalam ? "പ്രൊഫൈൽ മാറ്റാൻ സാധിച്ചില്ല" : "Failed to update profile"));
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = useMemo(
    () => crews.filter((c) => (c.status || "pending") === "pending").length,
    [crews]
  );
  const approvedCount = useMemo(
    () => crews.filter((c) => c.status === "approved").length,
    [crews]
  );
  const rejectedCount = useMemo(
    () => crews.filter((c) => c.status === "rejected").length,
    [crews]
  );

  const filtered = useMemo(() => {
    return crews.filter((c) => {
      const status = c.status || "pending";
      const matchFilter =
        filter === "all" ||
        (filter === "pending" && status === "pending") ||
        (filter === "approved" && status === "approved") ||
        (filter === "rejected" && status === "rejected");

      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.id?.includes(query) ||
        c.role?.toLowerCase().includes(query) ||
        c.specialisation?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query);

      return matchFilter && matchSearch;
    });
  }, [crews, filter, search]);

  const FILTERS = [
    {
      key: "pending",
      label: isMalayalam
        ? `പരിശോധനയിൽ${pendingCount > 0 ? ` (${pendingCount})` : ""}`
        : `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
    },
    {
      key: "all",
      label: isMalayalam ? `എല്ലാം (${crews.length})` : `All (${crews.length})`,
    },
    {
      key: "approved",
      label: isMalayalam ? `അംഗീകരിച്ചവ (${approvedCount})` : `Approved (${approvedCount})`,
    },
    {
      key: "rejected",
      label: isMalayalam ? `നിരസിച്ചവ (${rejectedCount})` : `Rejected (${rejectedCount})`,
    },
  ];

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ADMIN}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">
              {isMalayalam ? "അപേക്ഷകൾ ലോഡ് ചെയ്യുന്നു…" : "Loading crew applications…"}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ADMIN}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header section matching Manage Users */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {isMalayalam ? "ക്രൂ അംഗീകാരങ്ങൾ" : "Crew Approvals"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isMalayalam
                  ? "കേരളത്തിലുടനീളമുള്ള ക്രൂ പ്രൊഫൈൽ അപേക്ഷകൾ പരിശോധിച്ച് അംഗീകരിക്കുക"
                  : "Review and approve pending crew profile applications across Kerala"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm font-bold text-yellow-400">
                    {isMalayalam
                      ? `${pendingCount} അപേക്ഷകൾ പരിശോധനയിൽ`
                      : `${pendingCount} awaiting approval`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search + Filter toolbar matching Manage Users */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={
                  isMalayalam
                    ? "പേര്, റോൾ, ഫോൺ, ജില്ല എന്നിവ വഴി തിരയുക…"
                    : "Search by name, role, city, phone…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table matching Manage Users style */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "സാങ്കേതിക വിദഗ്ദ്ധൻ" : "Technician / Applicant"}
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "റോൾ & വിവരങ്ങൾ" : "Role & Craft"}
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "സ്ഥലം & പരിധി" : "Location"}
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "സ്റ്റാറ്റസ്" : "Status"}
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "അപേക്ഷിച്ച തീയതി" : "Applied"}
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isMalayalam ? "നടപടികൾ" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        {filter === "pending" && pendingCount === 0 ? (
                          <div className="max-w-md mx-auto py-6">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                              <Check className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-1">
                              {isMalayalam ? "എല്ലാം പരിശോധിച്ചു കഴിഞ്ഞു!" : "All caught up!"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {isMalayalam
                                ? "എല്ലാ ക്രൂ പ്രൊഫൈലുകളും പരിശോധിച്ചു. പുതിയ അപേക്ഷകൾ ഇവിടെ തത്സമയം ലഭ്യമാകും."
                                : "All crew profiles have been reviewed. New applications submitted by technicians will appear here in real-time."}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm">
                            {isMalayalam ? "അപേക്ഷകൾ ഒന്നും കണ്ടെത്തിയില്ല" : "No crew applications found matching filter"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((crew, idx) => {
                      const crewId = crew.id || crew.uid || crew.phone || `crew-${idx}`;
                      const crewName = crew.name || "Technician";
                      const crewPhone = crew.phone || (crew.id ? `+${crew.id}` : "—");
                      const status = crew.status || "pending";
                      const isPending = status === "pending";
                      const isApproved = status === "approved";
                      const isBusy = updatingId === crewId;

                      return (
                        <tr key={crewId} className="hover:bg-muted/20 transition-colors">
                          {/* Technician */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-primary">
                                  {crewName !== "—" ? crewName[0].toUpperCase() : "C"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{crewName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{crewPhone}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role & Craft */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border bg-primary/10 border-primary/20 text-primary">
                              {crew.role || "AV Technician"}
                            </span>
                            {crew.specialisation && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {crew.specialisation}
                              </p>
                            )}
                            {(crew.experience || crew.ratePerDay) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {crew.experience ? `${crew.experience} yrs` : "0-2 yrs"}
                                {crew.ratePerDay ? ` · ₹${crew.ratePerDay}/day` : ""}
                              </p>
                            )}
                          </td>

                          {/* Location */}
                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-foreground">{crew.city || "Kerala"}</p>
                            <p className="text-xs text-muted-foreground">
                              {crew.travelRadius || crew.travelRange || "All Kerala"}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                {isMalayalam ? "പരിശോധനയിൽ" : "Pending"}
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-400/10 border border-green-400/20 text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                {isMalayalam ? "അംഗീകരിച്ചു" : "Approved"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-400/10 border border-red-400/20 text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {isMalayalam ? "നിരസിച്ചു" : "Rejected"}
                              </span>
                            )}
                          </td>

                          {/* Applied */}
                          <td className="px-5 py-4">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(crew.createdAt)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApproval(crewId, true, crewName)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {isMalayalam ? "അംഗീകരിക്കുക" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApproval(crewId, false, crewName)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {isMalayalam ? "നിരസിക്കുക" : "Reject"}
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApproval(crewId, false, crewName)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  {isMalayalam ? "പിൻവലിക്കുക" : "Revoke"}
                                </button>
                              )}

                              {!isPending && !isApproved && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApproval(crewId, true, crewName)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {isMalayalam ? "അംഗീകരിക്കുക" : "Approve"}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedCrew(crew)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {isMalayalam ? "വിശദാംശങ്ങൾ" : "Details"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {filtered.length} {isMalayalam ? "അപേക്ഷകൾ കാണിക്കുന്നു · തത്സമയം അപ്ഡേറ്റ് ആകുന്നു" : "applications shown · Updates in real-time"}
          </p>
        </div>

        {/* Candidate Detail Modal */}
        {selectedCrew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {selectedCrew.name?.[0]?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedCrew.name || "Technician"}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{selectedCrew.phone || `+${selectedCrew.id}`}</p>
                    <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {selectedCrew.role || "AV Technician"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCrew(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick specs grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/30 border border-border rounded-xl text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Location / City</span>
                  <span className="font-semibold text-foreground">{selectedCrew.city || "Kerala"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Travel Radius</span>
                  <span className="font-semibold text-foreground">{selectedCrew.travelRadius || selectedCrew.travelRange || "All Kerala"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Experience</span>
                  <span className="font-semibold text-foreground">{selectedCrew.experience || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Standard Rate</span>
                  <span className="font-semibold text-foreground">
                    {selectedCrew.ratePerDay ? formatCurrency(selectedCrew.ratePerDay) : "Standard / On Request"}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Professional Bio
                </h4>
                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/20 p-3 rounded-xl border border-border">
                  {selectedCrew.bio || "No professional bio submitted."}
                </p>
              </div>

              {/* Portfolio Link */}
              {selectedCrew.portfolioLink && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Portfolio / Social
                  </h4>
                  <a
                    href={selectedCrew.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                  >
                    {selectedCrew.portfolioLink}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedCrew(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Close
                </button>
                {selectedCrew.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === (selectedCrew.id || selectedCrew.phone)}
                      onClick={() => handleApproval(selectedCrew.id || selectedCrew.phone, false, selectedCrew.name)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === (selectedCrew.id || selectedCrew.phone)}
                      onClick={() => handleApproval(selectedCrew.id || selectedCrew.phone, true, selectedCrew.name)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                    >
                      Approve & Grant Badge
                    </button>
                  </>
                ) : selectedCrew.status === "approved" ? (
                  <button
                    type="button"
                    disabled={updatingId === (selectedCrew.id || selectedCrew.phone)}
                    onClick={() => handleApproval(selectedCrew.id || selectedCrew.phone, false, selectedCrew.name)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    Revoke Approval
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={updatingId === (selectedCrew.id || selectedCrew.phone)}
                    onClick={() => handleApproval(selectedCrew.id || selectedCrew.phone, true, selectedCrew.name)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                  >
                    Approve Application
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
