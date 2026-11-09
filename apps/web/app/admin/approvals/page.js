"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToPendingCrew } from "@/lib/firestore";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatCurrency } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { toast } from "sonner";
import { Check, X, MapPin, Briefcase, IndianRupee, Compass, ExternalLink } from "lucide-react";

export default function AdminApprovalsPage() {
  const { currentUser } = useAuth();
  const { t, isMalayalam } = useLanguage();
  const [crews, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Real-time listener — auto-updates when crew status changes in Firestore
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = subscribeToPendingCrew((result) => {
      if (result.success) {
        setCrew(result.data || []);
      } else {
        setError(result.error);
        toast.error("Failed to load pending crew: " + result.error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleApproval = async (crewId, approve, crewName = "Crew member") => {
    if (!crewId) {
      toast.error("Invalid crew ID");
      return;
    }
    setUpdatingId(crewId);
    setError("");

    try {
      const res = await fetch("/api/admin/approve", {
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
        // Optimistic / immediate real-time update
        setCrew((prev) =>
          prev.filter((c) => (c.id || c.uid || c.phone) !== crewId)
        );
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
        const msg = data.error || (isMalayalam ? "മാറ്റങ്ങൾ വരുത്താൻ കഴിഞ്ഞില്ല" : "Update failed");
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error("[Approvals] handleApproval error:", err);
      const msg = err.message || (isMalayalam ? "പ്രൊഫൈൽ മാറ്റാൻ സാധിച്ചില്ല" : "Failed to update profile");
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ADMIN}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Loading pending applications…</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ADMIN}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isMalayalam ? "ക്രൂ അംഗീകാരങ്ങൾ" : "Crew Approvals"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isMalayalam
                  ? "കേരളത്തിലുടനീളമുള്ള ക്രൂ പ്രൊഫൈൽ അപേക്ഷകൾ പരിശോധിച്ച് അംഗീകരിക്കുക"
                  : "Review and approve pending crew profile applications across Kerala"}
              </p>
            </div>
            {crews.length > 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold w-fit">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {isMalayalam
                  ? `${crews.length} അപേക്ഷകൾ പരിശോധനയിൽ`
                  : `${crews.length} pending review`}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {crews.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {isMalayalam ? "എല്ലാം പരിശോധിച്ചു കഴിഞ്ഞു!" : "All caught up!"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {isMalayalam
                  ? "എല്ലാ ക്രൂ പ്രൊഫൈലുകളും പരിശോധിച്ചു. സാങ്കേതിക പ്രവർത്തകർ സമർപ്പിക്കുന്ന പുതിയ അപേക്ഷകൾ ഇവിടെ തത്സമയം കാണാം."
                  : "All crew profiles have been reviewed. New applications submitted by technicians will appear here in real-time."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {crews.map((crew, idx) => {
                const crewId = crew.id || crew.uid || crew.phone || `crew-${idx}`;
                const crewName = crew.name || "Unnamed Crew";
                const isBusy = updatingId === crewId;

                return (
                  <div
                    key={crewId}
                    className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-border/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-lg">
                            {crewName[0]?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-foreground">
                            {crewName}
                          </h3>
                          <p className="text-primary font-semibold text-sm">
                            {crew.role || "AV Technician"}
                            {crew.specialisation ? ` · ${crew.specialisation}` : ""}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {isMalayalam ? "അപേക്ഷിച്ച തീയതി: " : "Applied "}
                            {formatDate(crew.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={crew.status || "pending"} type="crew" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 py-4 border-t border-b border-border text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                          {isMalayalam ? "പരിചയസമ്പത്ത്" : "Experience"}
                        </p>
                        <p className="font-semibold text-foreground">
                          {crew.experience ? `${crew.experience} years` : "0-2 years"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {isMalayalam ? "സ്ഥലം" : "Location"}
                        </p>
                        <p className="font-semibold text-foreground">
                          {crew.city || "Kerala"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                          {isMalayalam ? "യാത്രാ പരിധി" : "Travel Range"}
                        </p>
                        <p className="font-semibold text-foreground">
                          {crew.travelRange
                            ? `${crew.travelRange} km`
                            : (isMalayalam ? "ജില്ലയ്ക്കുള്ളിൽ" : "Within district")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                          {isMalayalam ? "പ്രതിദിന വേതനം" : "Rate/Day"}
                        </p>
                        <p className="font-semibold text-foreground">
                          {crew.ratePerDay
                            ? formatCurrency(crew.ratePerDay)
                            : (isMalayalam ? "നേരിട്ട് സംസാരിക്കാം" : "Standard / Negotiable")}
                        </p>
                      </div>
                    </div>

                    {crew.bio && (
                      <div className="mb-6 p-4 bg-muted/40 border border-border/60 rounded-xl">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          {isMalayalam ? "വിവരണം / ബയോ" : "Bio / Overview"}
                        </p>
                        <p className="text-sm text-foreground/90 leading-relaxed">{crew.bio}</p>
                      </div>
                    )}

                    {crew.portfolioLink && (
                      <div className="mb-6">
                        <a
                          href={crew.portfolioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-semibold"
                        >
                          {isMalayalam ? "പോർട്ട്ഫോളിയോ ലിങ്ക് കാണുക" : "View Portfolio Link"}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApproval(crewId, true, crewName)}
                        disabled={isBusy}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                      >
                        {isBusy ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            {isMalayalam ? "അംഗീകരിക്കുക" : "Approve"}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(crewId, false, crewName)}
                        disabled={isBusy}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isBusy ? (
                          <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            {isMalayalam ? "നിരസിക്കുക" : "Reject"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
