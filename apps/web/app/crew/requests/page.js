"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import LanguageToggle from "@/components/LanguageToggle";
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
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewRequestsPage() {
  const { currentUser, userPhone } = useAuth();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const phone =
    userPhone ||
    currentUser?.phoneNumber ||
    (currentUser?.uid && /^\d+$/.test(currentUser.uid) ? `+${currentUser.uid}` : null);

  const fetchRequests = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/crew/requests?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (res.ok) {
        setBookings(json.data || []);
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
  }, [fetchRequests]);

  const handleRespond = async (bookingId, response) => {
    if (updatingId) return;
    setUpdatingId(bookingId);
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

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button
                type="button"
                onClick={fetchRequests}
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
                title="Refresh requests"
                aria-label="Refresh requests"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
          </div>

          {/* Requests List */}
          {displayedList.length === 0 ? (
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
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
