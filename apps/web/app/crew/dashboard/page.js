"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { calculateProfileCompleteness, PARENT_ROLES } from "@/utils/taxonomy";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import LanguageToggle from "@/components/LanguageToggle";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { USER_ROLES } from "@/utils/constants";
import {
  User,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Award,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewDashboardPage() {
  const { currentUser, userPhone, userRole } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const [crew, setCrew] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [respondingId, setRespondingId] = useState(null);
  const [dismissMissedAlert, setDismissMissedAlert] = useState(false);

  const phone = userPhone || currentUser?.phoneNumber || (currentUser?.uid && /^\d+$/.test(currentUser.uid) ? `+${currentUser.uid}` : null);

  // Fetch crew profile & incoming requests
  const fetchData = useCallback(async () => {
    if (!phone) return;
    setError("");

    try {
      const [profileRes, requestsRes, availRes] = await Promise.all([
        fetch(`/api/crew/profile?phone=${encodeURIComponent(phone)}`),
        fetch(`/api/crew/requests?phone=${encodeURIComponent(phone)}`),
        fetch(`/api/crew/availability?phone=${encodeURIComponent(phone)}`),
      ]);

      if (profileRes.ok) {
        const pJson = await profileRes.json();
        if (pJson.data) {
          // Merge with availability check data (enforcing auto-expiry)
          if (availRes.ok) {
            const aJson = await availRes.json();
            pJson.data.available = aJson.data?.available ?? pJson.data.available;
            pJson.data.autoExpired = aJson.data?.autoExpired ?? false;
            pJson.data.availableExpiresAt = aJson.data?.availableExpiresAt ?? pJson.data.availableExpiresAt;
          }
          setCrew(pJson.data);
        }
      } else {
        // If not found, redirect to onboarding
        router.push("/crew/onboarding");
        return;
      }

      if (requestsRes.ok) {
        const rJson = await requestsRes.json();
        setRequests(rJson.data || []);
      }
    } catch (err) {
      console.error("[CrewDashboard] Fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [phone, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Availability Change from Toggle
  const handleAvailabilityChange = (newAvail) => {
    setCrew((prev) => ({
      ...prev,
      available: newAvail.available,
      autoExpired: newAvail.autoExpired,
      availableExpiresAt: newAvail.availableExpiresAt,
      coarseLocation: newAvail.coarseCity ? { city: newAvail.coarseCity } : prev?.coarseLocation,
    }));
  };

  // Respond to request: "Yes" (accept) or "No" (decline)
  const handleRespondToRequest = async (bookingId, response) => {
    if (respondingId) return;
    setRespondingId(bookingId);
    setError("");

    try {
      const res = await fetch("/api/crew/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          bookingId,
          response, // "accepted" | "declined"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit response.");
      }

      // Update local state smoothly
      setRequests((prev) =>
        prev.map((req) =>
          req.id === bookingId
            ? {
                ...req,
                status: response,
                respondedAt: data.respondedAt,
                responseChannel: "web",
              }
            : req
        )
      );

      // If accepted, update local crew availability to false (booked)
      if (response === "accepted") {
        setCrew((prev) => ({ ...prev, available: false }));
        toast.success(isMl ? "റിക്വസ്റ്റ് സ്വീകരിച്ചു! ഓർഗനൈസറെ അറിയിച്ചിട്ടുണ്ട്." : "Request accepted! Organizer has been notified.");
      } else {
        toast.info(isMl ? "റിക്വസ്റ്റ് നിരസിച്ചു." : "Request declined.");
      }
    } catch (err) {
      setError(err.message || "Network error. Please try again.");
      toast.error(err.message || "Network error. Please try again.");
    } finally {
      setRespondingId(null);
    }
  };

  // Switch availability OFF from missed requests warning
  const handleSwitchOffMissed = async () => {
    try {
      await fetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, available: false }),
      });
      setCrew((prev) => ({ ...prev, available: false }));
      setDismissMissedAlert(true);
    } catch (_) {}
  };

  // Filter requests
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const acceptedRequests = requests.filter((r) => r.status === "accepted");
  const declinedRequests = requests.filter((r) => r.status === "declined");
  const expiredRequests = requests.filter((r) => r.status === "expired");

  const filteredRequests =
    activeTab === "pending"
      ? pendingRequests
      : activeTab === "accepted"
      ? acceptedRequests
      : activeTab === "declined"
      ? declinedRequests
      : activeTab === "expired"
      ? expiredRequests
      : requests;

  // Calculate missed/declined count while available
  const recentMissedCount = declinedRequests.length + expiredRequests.length;
  const showMissedPrompt =
    !dismissMissedAlert &&
    crew?.available === true &&
    recentMissedCount >= 3;

  // Completeness calculation
  const completeness = calculateProfileCompleteness(crew || {});

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("common.loading", "Loading your dashboard...")}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Resolve role labels
  const roleId = crew?.role;
  const parentRoleObj = PARENT_ROLES.find((r) => r.id === roleId);
  const displayRole = parentRoleObj ? (isMl ? parentRoleObj.nameMl : parentRoleObj.nameEn) : (crew?.role || "Crew Member");

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background text-foreground pb-16">
        {/* Top Bar / Greeting */}
        <div className="border-b border-border bg-card/40">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {t("dashboard.welcome", "Welcome back")}, {crew?.name || "Technician"}!
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {displayRole} · {crew?.city || "Kerala"} · {crew?.phone}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button
                onClick={fetchData}
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
                title="Refresh Dashboard"
                aria-label="Refresh Dashboard"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Missed Requests Alert */}
          {showMissedPrompt && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {isMl ? "ലഭ്യത പരിശോധിക്കുക" : "Review Your Availability"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      "dashboard.missedRequestsAlert",
                      "You have missed or declined several recent availability requests. Would you like to switch your availability off?"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSwitchOffMissed}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
                >
                  {t("dashboard.switchOffNow", "Switch Off Availability")}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissMissedAlert(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  {t("dashboard.keepAvailable", "Keep Available")}
                </button>
              </div>
            </div>
          )}

          {/* ─── SECTION 1: WELCOME & ACCOUNT CARD ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center shrink-0">
                    {crew?.profileImage ? (
                      <img
                        src={crew.profileImage}
                        alt={crew.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-lg text-foreground truncate">
                      {crew?.name}
                    </h3>
                    <p className="text-xs font-semibold text-primary truncate">
                      {displayRole}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{crew?.city || "Kerala"}</span>
                    </p>
                  </div>
                </div>

                {/* Account Status Badge */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {isMl ? "അക്കൗണ്ട് നില:" : "Account Status:"}
                    </span>
                    {crew?.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t("dashboard.approved", "Active & Approved")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t("dashboard.underReview", "Under Review")}</span>
                      </span>
                    )}
                  </div>

                  {crew?.associationMembership?.verified && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold pt-1">
                      <Award className="w-4 h-4" />
                      <span>{crew.associationMembership.name} Verified Member</span>
                    </div>
                  )}

                  {crew?.ratePerDay ? (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">
                        {isMl ? "പ്രതിദിന വേതനം:" : "Day Rate:"}
                      </span>
                      <span className="font-bold text-foreground">
                        ₹ {Number(crew.ratePerDay).toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({crew.rateVisible !== false ? (isMl ? "പരസ്യം" : "Public") : (isMl ? "സ്വകാര്യം" : "Private")})
                        </span>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-border flex gap-2">
                <Link
                  href="/crew/setup"
                  className="flex-1 py-2 px-3 rounded-xl bg-muted border border-border hover:border-primary/60 text-xs font-semibold text-foreground text-center transition-all"
                >
                  {t("dashboard.editProfile", "Edit Full Profile")}
                </Link>
                <Link
                  href="/crew/requests"
                  className="py-2 px-3 rounded-xl bg-card border border-border hover:border-primary/60 text-xs font-semibold text-foreground text-center transition-all"
                >
                  {t("dashboard.viewAllRequests", "Manage Requests")}
                </Link>
              </div>
            </div>

            {/* Availability Status & Toggle */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">
                    {t("dashboard.availabilityStatus", "Availability Status")}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {crew?.available ? (
                      <span className="text-green-400 font-medium">● Visible in Recruiter Searches</span>
                    ) : (
                      <span className="text-zinc-500 font-medium">○ Hidden from Searches</span>
                    )}
                  </span>
                </div>

                <AvailabilityToggle
                  phone={phone}
                  isAvailable={crew?.available || false}
                  isAutoExpired={crew?.autoExpired || false}
                  availableExpiresAt={crew?.availableExpiresAt}
                  currentCity={crew?.city}
                  onChange={handleAvailabilityChange}
                />
              </div>

              {/* Profile Completeness Widget */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {t("dashboard.profileCompleteness", "Profile Completeness")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completeness.nextAction
                        ? isMl
                          ? completeness.nextAction.textMl
                          : completeness.nextAction.textEn
                        : (isMl ? "നിങ്ങളുടെ പ്രൊഫൈൽ പൂർണ്ണമാണ്!" : "Your profile is 100% complete!")}
                    </p>
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {completeness.percentage}%
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${completeness.percentage}%` }}
                  />
                </div>

                {/* Missing Fields & Action */}
                {completeness.missingFields.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{isMl ? "ചേർക്കാൻ ബാക്കിയുള്ളവ:" : "Missing:"}</span>
                      {completeness.missingFields.slice(0, 3).map((f) => (
                        <span
                          key={f.key}
                          className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground border border-border"
                        >
                          {isMl ? f.labelMl : f.labelEn}
                        </span>
                      ))}
                      {completeness.missingFields.length > 3 && (
                        <span className="text-[11px]">+{completeness.missingFields.length - 3} more</span>
                      )}
                    </div>

                    <Link
                      href="/crew/setup"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <span>{isMl ? "വിവരങ്ങൾ നൽകുക" : "Complete Now"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold pt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isMl ? "എല്ലാ വിവരങ്ങളും പൂർത്തിയായിട്ടുണ്ട്!" : "Profile is complete and ready for booking!"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: INCOMING AVAILABILITY REQUESTS ─── */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {t("dashboard.incomingRequests", "Incoming Work Requests")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isMl
                    ? "ഓർഗനൈസർമാർ അയച്ച ലഭ്യത റിക്വസ്റ്റുകൾക്ക് വേഗത്തിൽ മറുപടി നൽകുക."
                    : "Respond quickly to event recruiters to lock in direct bookings."}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("pending")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "pending"
                      ? "bg-primary text-black font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("dashboard.pendingRequests", "Pending")} ({pendingRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("accepted")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "accepted"
                      ? "bg-primary text-black font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("dashboard.acceptedRequests", "Accepted")} ({acceptedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("declined")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "declined"
                      ? "bg-primary text-black font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("dashboard.declinedRequests", "Declined")} ({declinedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "all"
                      ? "bg-primary text-black font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("dashboard.allRequests", "All")} ({requests.length})
                </button>
              </div>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20">
                <Clock className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-foreground">
                  {activeTab === "pending"
                    ? t("dashboard.noPendingRequests", "No pending availability requests.")
                    : t("dashboard.noRequests", "No requests yet. Switch availability on to be found by event organizers.")}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {crew?.available
                    ? (isMl ? "നിങ്ങൾ വർക്കിനായി ലഭ്യമാണ്. ഓർഗനൈസർമാർ ബന്ധപ്പെടുമ്പോൾ ഇവിടെ കാണാം." : "You are marked Available. As recruiters search your area, requests will appear here.")
                    : (isMl ? "ലഭ്യത ഓൺ ചെയ്താൽ മാത്രമേ ഓർഗനൈസർമാർക്ക് നിങ്ങളെ കണ്ടെത്താൻ സാധിക്കൂ." : "Turn on your availability above to get discovered for upcoming events.")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const isPending = req.status === "pending";
                  const isAccepted = req.status === "accepted";
                  const isDeclined = req.status === "declined";
                  const isExpired = req.status === "expired";
                  const isBusy = respondingId === req.id;

                  return (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl bg-muted/40 border border-border hover:border-zinc-600 transition-all space-y-4"
                    >
                      {/* Request Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {req.organizerName || req.workType || "Event Gig Request"}
                            </span>
                            {/* Status Badge */}
                            {isAccepted && (
                              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[11px] font-bold">
                                {t("requests.acceptedBadge", "Accepted")}
                              </span>
                            )}
                            {isDeclined && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-bold">
                                {t("requests.declinedBadge", "Declined")}
                              </span>
                            )}
                            {isExpired && (
                              <span className="px-2.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-400 border border-zinc-600 text-[11px] font-bold">
                                {t("requests.expiredBadge", "Expired")}
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold animate-pulse">
                                {isMl ? "പുതിയ റിക്വസ്റ്റ്" : "Pending Response"}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.notes || (isMl ? "ഓർഗനൈസർ നിങ്ങളുടെ ലഭ്യത ആവശ്യപ്പെടുന്നു." : "Organizers are requesting your availability for this date.")}
                          </p>
                        </div>

                        {req.rate && (
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">{t("requests.rateOffered", "Rate Offered")}</span>
                            <div className="text-sm font-extrabold text-foreground">
                              ₹ {Number(req.rate).toLocaleString("en-IN")}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-card border border-border/80 text-xs">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                              {t("requests.roleRequested", "Role")}
                            </span>
                            <span className="font-semibold text-foreground">{req.role || displayRole}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                              {t("requests.date", "Date(s)")}
                            </span>
                            <span className="font-semibold text-foreground">{req.date || "Scheduled Date"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                              {t("requests.location", "Location")}
                            </span>
                            <span className="font-semibold text-foreground">{req.location || crew?.city || "Kerala"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Response Deadline if configured */}
                      {req.responseDeadline && isPending && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {t("requests.deadline", "Respond by")}: {new Date(req.responseDeadline).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Actions: Yes / No Buttons for pending */}
                      {isPending && (
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleRespondToRequest(req.id, "accepted")}
                            disabled={isBusy}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-green-600/20"
                          >
                            {isBusy ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{t("requests.yesAvailable", "Yes, I'm Available")}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRespondToRequest(req.id, "declined")}
                            disabled={isBusy}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-muted border border-border hover:bg-red-950/40 hover:border-red-800 text-muted-foreground hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{t("requests.noDecline", "Decline Request")}</span>
                          </button>
                        </div>
                      )}

                      {/* Already Responded Status Confirmation */}
                      {!isPending && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
                          <span>
                            {isAccepted
                              ? t("requests.confirmAccept", "You accepted this request.")
                              : isDeclined
                              ? t("requests.confirmDecline", "You declined this request.")
                              : t("requests.expiredNotice", "This request expired.")}
                          </span>
                          {req.respondedAt && (
                            <span className="text-[11px] opacity-70">
                              {new Date(req.respondedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
