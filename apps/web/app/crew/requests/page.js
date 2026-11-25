"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { USER_ROLES } from "@/utils/constants";
import { formatDate } from "@/utils/formatting";
import {
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarCheck,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewRequestsPage() {
  const { currentUser, userPhone } = useAuth();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const [bookings, setBookings] = useState([]);
  const [holds, setHolds] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingHoldId, setUpdatingHoldId] = useState(null);
  const [showAvailabilityPrompt, setShowAvailabilityPrompt] = useState(false);
  const [submittingAvailAction, setSubmittingAvailAction] = useState(false);

  const phone =
    userPhone ||
    currentUser?.phoneNumber ||
    (currentUser?.uid && /^\d+$/.test(currentUser.uid) ? `+${currentUser.uid}` : null);

  const fetchHolds = useCallback(async () => {
    try {
      const res = await apiFetch("/api/prebookings");
      const json = await res.json();
      if (res.ok && json.success) {
        setHolds(json.items || []);
      }
    } catch (_) {}
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/api/crew/requests?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (res.ok) {
        setBookings(json.data || []);
        if (json.shouldPromptAvailabilityReview) {
          const dismissed = typeof window !== "undefined" && sessionStorage.getItem("crewhive_dismissed_avail_review");
          if (!dismissed) {
            setShowAvailabilityPrompt(true);
          }
        }
      } else {
        setError(json.error || "Failed to load requests.");
      }
    } catch (err) {
      console.error("[CrewRequests] Fetch error:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchRequests();
    fetchHolds();
  }, [fetchRequests, fetchHolds]);

  const handleHoldResponse = async (holdId, status) => {
    setUpdatingHoldId(holdId);
    try {
      const res = await apiFetch(`/api/prebookings/${holdId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          status === "accepted"
            ? (isMl ? "തീയതി ഹോൾഡ് സ്വീകരിച്ചു!" : "Date hold accepted!")
            : (isMl ? "തീയതി ഹോൾഡ് നിരസിച്ചു." : "Date hold declined.")
        );
        setHolds((prev) =>
          prev.map((h) => (h.id === holdId ? { ...h, status } : h))
        );
      } else {
        toast.error(json.error || "Failed to update hold.");
      }
    } catch (err) {
      toast.error(err.message || "Network error updating date hold");
    } finally {
      setUpdatingHoldId(null);
    }
  };

  const handleTurnAvailabilityOff = async () => {
    setSubmittingAvailAction(true);
    try {
      const res = await apiFetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: false }),
      });
      if (res.ok) {
        toast.success(
          isMl
            ? "ലഭ്യത ഓഫാക്കി. ഇനി പുതിയ അടിയന്തര റിക്വസ്റ്റുകൾ ലഭിക്കില്ല."
            : "Availability switched off. You will no longer receive immediate requests."
        );
        setShowAvailabilityPrompt(false);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("crewhive_dismissed_avail_review", "true");
        }
      } else {
        toast.error("Failed to update availability.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update availability.");
    } finally {
      setSubmittingAvailAction(false);
    }
  };

  const handleKeepAvailabilityOn = () => {
    setShowAvailabilityPrompt(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("crewhive_dismissed_avail_review", "true");
    }
    toast.info(
      isMl
        ? "ലഭ്യത ഓണായി തുടരുന്നു. റിക്വസ്റ്റുകൾക്ക് വേഗത്തിൽ മറുപടി നൽകാൻ ശ്രദ്ധിക്കുക."
        : "Availability kept on. Please try to respond to incoming requests promptly."
    );
  };

  const handleRemindLater = () => {
    setShowAvailabilityPrompt(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("crewhive_dismissed_avail_review", "true");
    }
  };

  const handleRespond = async (bookingId, response) => {
    if (updatingId) return;
    setUpdatingId(bookingId);
    setError("");

    try {
      const res = await apiFetch("/api/crew/requests", {
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
        throw new Error(data.error || "Failed to update request.");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: response,
                respondedAt: data.respondedAt,
                responseChannel: "web",
              }
            : b
        )
      );

      if (response === "accepted") {
        toast.success(
          isMl
            ? "റിക്വസ്റ്റ് സ്വീകരിച്ചു! ഓർഗനൈസറെ അറിയിച്ചിട്ടുണ്ട്."
            : "Request accepted! Organizer has been notified."
        );
      } else {
        toast.info(
          isMl ? "റിക്വസ്റ്റ് നിരസിച്ചു." : "Request declined."
        );
      }
    } catch (err) {
      console.error("[CrewRequests] Response error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to update request");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingList = bookings.filter((b) => b.status === "pending");
  const acceptedList = bookings.filter((b) => b.status === "accepted");
  const declinedList = bookings.filter((b) => b.status === "declined");
  const expiredList = bookings.filter((b) => b.status === "expired");

  const displayedList =
    activeTab === "pending"
      ? pendingList
      : activeTab === "accepted"
      ? acceptedList
      : activeTab === "declined"
      ? declinedList
      : activeTab === "expired"
      ? expiredList
      : bookings;

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("common.loading", "Loading requests...")}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background text-foreground pb-16">
        {/* Header */}
        <div className="border-b border-border bg-card/40">
          <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t("requests.title", "Booking & Availability Requests")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t("requests.subtitle", "Respond quickly to recruiters looking for crew in Kerala.")}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Availability Review Prompt (G8) */}
          {showAvailabilityPrompt && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-bold text-foreground">
                    {isMl ? "ലഭ്യത പുനഃപരിശോധിക്കുക" : "Availability Review"}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isMl
                      ? "നിങ്ങൾക്ക് അടിയന്തര ലഭ്യത റിക്വസ്റ്റുകൾ ലഭിക്കുന്നുണ്ടെങ്കിലും മറുപടി നൽകുന്നില്ല. ലഭ്യത ഓഫാക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
                      : "You're receiving availability requests but haven't been responding. Would you like to switch off your availability?"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-11">
                <button
                  type="button"
                  onClick={handleTurnAvailabilityOff}
                  disabled={submittingAvailAction}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingAvailAction
                    ? isMl ? "മാറ്റുന്നു..." : "Updating..."
                    : isMl ? "ലഭ്യത ഓഫ് ചെയ്യുക" : "Turn availability off"}
                </button>
                <button
                  type="button"
                  onClick={handleKeepAvailabilityOn}
                  disabled={submittingAvailAction}
                  className="px-3.5 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  {isMl ? "ലഭ്യത ഓൺ ആയി തുടരട്ടെ" : "Keep availability on"}
                </button>
                <button
                  type="button"
                  onClick={handleRemindLater}
                  disabled={submittingAvailAction}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {isMl ? "പിന്നീട് ഓർമ്മിപ്പിക്കുക" : "Remind me later"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl text-xs font-semibold overflow-x-auto w-full sm:w-max">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "pending"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("dashboard.pendingRequests", "Pending")} ({pendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("accepted")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "accepted"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("dashboard.acceptedRequests", "Accepted")} ({acceptedList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("declined")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "declined"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("dashboard.declinedRequests", "Declined")} ({declinedList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expired")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "expired"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("dashboard.expiredRequests", "Expired")} ({expiredList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "all"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("dashboard.allRequests", "All")} ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("holds")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "holds"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" />
                {isMl ? "തീയതി ഹോൾഡുകൾ" : "Date Holds"} ({holds.length})
              </span>
            </button>
          </div>

          {/* Date Holds View (I7 [P2]) */}
          {activeTab === "holds" ? (
            holds.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card">
                <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {isMl ? "തീയതി ഹോൾഡുകൾ ഒന്നും ലഭിച്ചിട്ടില്ല." : "No date holds received yet."}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {isMl
                    ? "ഓർഗനൈസർമാർ നിങ്ങളുടെ തീയതികൾ മുൻകൂട്ടി ഹോൾഡ് ചെയ്യുമ്പോൾ അവ ഇവിടെ കാണാം."
                    : "When event organizers place a 48-hour date hold for an upcoming production, it will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {holds.map((hold) => {
                  const isHoldPending = hold.status === "pending";
                  const isHoldAccepted = hold.status === "accepted";
                  const isHoldDeclined = hold.status === "declined";
                  const isHoldExpired = hold.status === "expired";
                  const isHoldCancelled = hold.status === "cancelled";
                  const isBusy = updatingHoldId === hold.id;

                  return (
                    <div
                      key={hold.id}
                      className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                              isHoldPending
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                : isHoldAccepted
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                : isHoldDeclined
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {hold.status}
                          </span>
                          <h3 className="text-sm font-bold text-foreground">
                            {hold.eventName || "Event Hold"}
                          </h3>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          ID: #{hold.id.slice(-6)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[10px] text-muted-foreground block">
                              {isMl ? "തീയതി" : "Dates"}
                            </span>
                            <span className="font-semibold text-foreground">
                              {hold.date}
                              {hold.endDate && hold.endDate !== hold.date ? ` → ${hold.endDate}` : ""}
                            </span>
                          </div>
                        </div>

                        {hold.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <span className="text-[10px] text-muted-foreground block">
                                {isMl ? "സ്ഥലം" : "Location"}
                              </span>
                              <span className="font-semibold text-foreground">{hold.location}</span>
                            </div>
                          </div>
                        )}

                        {hold.offeredRate && (
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <span className="text-[10px] text-muted-foreground block">
                                {isMl ? "വാഗ്ദാനം ചെയ്ത നിരക്ക്" : "Offered Rate"}
                              </span>
                              <span className="font-semibold text-foreground">
                                ₹{Number(hold.offeredRate).toLocaleString("en-IN")} / day
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {hold.notes && (
                        <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                          {hold.notes}
                        </div>
                      )}

                      {/* Actions for Pending Hold */}
                      {isHoldPending && (
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleHoldResponse(hold.id, "accepted")}
                            disabled={isBusy}
                            className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-green-600/20"
                          >
                            {isBusy ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isMl ? "ഹോൾഡ് സ്വീകരിക്കുക" : "Accept Date Hold"}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleHoldResponse(hold.id, "declined")}
                            disabled={isBusy}
                            className="flex-1 py-3 px-4 rounded-xl bg-muted border border-border hover:bg-red-950/40 hover:border-red-800 text-muted-foreground hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{isMl ? "നിരസിക്കുക" : "Decline Hold"}</span>
                          </button>
                        </div>
                      )}

                      {!isHoldPending && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
                          <span>
                            {isHoldAccepted
                              ? (isMl ? "നിങ്ങൾ ഈ തീയതി ഹോൾഡ് സ്വീകരിച്ചു." : "You accepted this date hold.")
                              : isHoldDeclined
                              ? (isMl ? "നിങ്ങൾ ഈ തീയതി ഹോൾഡ് നിരസിച്ചു." : "You declined this date hold.")
                              : isHoldExpired
                              ? (isMl ? "ഈ ഹോൾഡ് കാലാവധി കഴിഞ്ഞു." : "This hold has expired.")
                              : (isMl ? "ഈ ഹോൾഡ് റദ്ദാക്കപ്പെട്ടു." : "This hold was cancelled by recruiter.")}
                          </span>
                          {hold.updatedAt && (
                            <span className="text-[11px] opacity-75">
                              {formatDate(hold.updatedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
          /* Requests List */
          displayedList.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">
                {activeTab === "pending"
                  ? t("dashboard.noPendingRequests", "No pending availability requests.")
                  : t("dashboard.noRequests", "No requests yet. Switch availability on to be found by event organizers.")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isMl
                  ? "ലഭ്യത ഓൺ ചെയ്തു വെച്ചാൽ കേരളത്തിലെ ഇവന്റ് ഓർഗനൈസർമാർക്ക് നിങ്ങളെ ബുക്ക് ചെയ്യാം."
                  : "Keep your availability on and profile updated to get direct booking inquiries from recruiters."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedList.map((booking) => {
                const isPending = booking.status === "pending";
                const isAccepted = booking.status === "accepted";
                const isDeclined = booking.status === "declined";
                const isExpired = booking.status === "expired";
                const isBusy = updatingId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-base font-extrabold text-foreground">
                            {booking.organizerName || booking.workType || "Event Gig Request"}
                          </h4>
                          {isAccepted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">
                              {t("requests.acceptedBadge", "Accepted")}
                            </span>
                          )}
                          {isDeclined && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
                              {t("requests.declinedBadge", "Declined")}
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-400 border border-zinc-600 text-xs font-bold">
                              {t("requests.expiredBadge", "Expired")}
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold animate-pulse">
                              {isMl ? "പുതിയ റിക്വസ്റ്റ്" : "Pending Response"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.createdAt ? formatDate(booking.createdAt) : "Recently requested"}
                        </p>
                      </div>

                      {booking.rate && (
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">{t("requests.rateOffered", "Rate Offered")}</span>
                          <span className="text-sm font-extrabold text-foreground">
                            ₹ {Number(booking.rate).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/60 border border-border text-xs">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                            {t("requests.roleRequested", "Role")}
                          </span>
                          <span className="font-semibold text-foreground">{booking.role || "Technician"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                            {t("requests.date", "Date(s)")}
                          </span>
                          <span className="font-semibold text-foreground">
                            {booking.date ? formatDate(booking.date) : "Event Date"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                            {t("requests.location", "Location")}
                          </span>
                          <span className="font-semibold text-foreground">{booking.location || "Kerala"}</span>
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                        {booking.notes}
                      </div>
                    )}

                    {/* Actions: Yes / No */}
                    {isPending && (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleRespond(booking.id, "accepted")}
                          disabled={isBusy}
                          className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-green-600/20"
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
                          onClick={() => handleRespond(booking.id, "declined")}
                          disabled={isBusy}
                          className="flex-1 py-3 px-4 rounded-xl bg-muted border border-border hover:bg-red-950/40 hover:border-red-800 text-muted-foreground hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t("requests.noDecline", "Decline Request")}</span>
                        </button>
                      </div>
                    )}

                    {!isPending && (
                      <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
                        <span>
                          {isAccepted
                            ? t("requests.confirmAccept", "You accepted this request. The recruiter will be notified.")
                            : isDeclined
                            ? t("requests.confirmDecline", "You declined this request.")
                            : t("requests.expiredNotice", "This request expired.")}
                        </span>
                        {booking.respondedAt && (
                          <span className="text-[11px] opacity-75">
                            {formatDate(booking.respondedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
