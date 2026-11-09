/**
 * /app/organizer/requests/page.js
 * Dedicated Availability Request Tracking Page
 *
 * Implements Prompt 3 Section 10:
 * - Request details (Role, date, location, type of work, creation date)
 * - Detailed breakdown of crew contacted with response status
 * - States: Pending, Accepted, Declined, No response, Confirmed match
 * - Near-real-time updates via 10-second live polling with status indicator
 * - No-response handling: informs recruiter, offers search widening recommendations,
 *   preserves full history
 * - Action to confirm match with an accepted technician
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Phone,
  MessageSquare,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function OrganizerRequestsPage() {
  const { currentUser, userPhone } = useAuth();
  const { isMalayalam } = useLanguage();

  const [requests, setRequests] = useState([]);
  const [aggregate, setAggregate] = useState({
    totalRequests: 0,
    pendingResponses: 0,
    acceptedResponses: 0,
    declinedResponses: 0,
    noResponses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  // Poll every 10 seconds for near-real-time screen updates (Prompt Section 10)
  useEffect(() => {
    fetchRequests(false);
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 10000); // 10-second near-real-time polling
    return () => clearInterval(interval);
  }, [currentUser, userPhone]);

  const fetchRequests = async (isBackground = false) => {
    if (!currentUser && !userPhone) return;
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const phoneParam = encodeURIComponent(userPhone || currentUser?.phoneNumber || "");

      const res = await fetch(`/api/requests/list?phone=${phoneParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      if (json.success) {
        setRequests(json.data || []);
        if (json.aggregate) setAggregate(json.aggregate);
        setLastUpdated(new Date());
      } else {
        if (!isBackground) setError(json.error || "Failed to load requests");
      }
    } catch (err) {
      if (!isBackground) setError(err.message || "Network error loading requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfirmMatch = async (requestId, crewMember) => {
    setConfirmingId(`${requestId}_${crewMember.crewId}`);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_match",
          confirmedCrewId: crewMember.crewId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Booking confirmed with ${crewMember.name}!`);
        await fetchRequests(true);
      } else {
        toast.error(json.error || "Failed to confirm match.");
      }
    } catch (_) {
      toast.error("Network error confirming booking.");
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {isMalayalam ? "അഭ്യർത്ഥനകൾ ലോഡ് ചെയ്യുന്നു..." : "Loading requests..."}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        {/* Page Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {isMalayalam ? "ലൈവ് ട്രാക്കിംഗ്" : "Live Ping Tracking"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    10s auto-refresh active
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {isMalayalam ? "അഭ്യർത്ഥനകൾ ട്രാക്ക് ചെയ്യുക" : "Availability Requests"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isMalayalam
                    ? "ക്രൂവിലേക്ക് അയച്ച എല്ലാ ലൈവ് റിക്വസ്റ്റുകളും അവയുടെ പ്രതികരണങ്ങളും ഇവിടെ കാണാം."
                    : "Track live responses across WhatsApp and Web as technicians accept or decline your gigs."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <LanguageToggle compact />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchRequests(false)}
                  disabled={refreshing}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Updating..." : "Refresh Now"}
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                  <Link href="/organizer/search">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    {isMalayalam ? "പുതിയ ക്രൂവിനെ തിരയുക" : "New Search"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Aggregate Counts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-card border border-border rounded-xl p-3.5">
              <span className="text-xs text-muted-foreground block">Total Sent</span>
              <span className="text-xl font-bold text-foreground">{aggregate.totalRequests}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <span className="text-xs text-amber-400 block">Pending</span>
              <span className="text-xl font-bold text-amber-400">{aggregate.pendingResponses}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <span className="text-xs text-emerald-400 block">Accepted</span>
              <span className="text-xl font-bold text-emerald-400">{aggregate.acceptedResponses}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <span className="text-xs text-rose-400 block">Declined</span>
              <span className="text-xl font-bold text-rose-400">{aggregate.declinedResponses}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3.5 col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block">No Response (2hr)</span>
              <span className="text-xl font-bold text-muted-foreground">{aggregate.noResponses}</span>
            </div>
          </div>

          {/* Requests List */}
          {requests.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isMalayalam ? "അഭ്യർത്ഥനകൾ ഒന്നും അയച്ചിട്ടില്ല" : "No Availability Requests Yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isMalayalam
                  ? "ടെക്നീഷ്യൻമാരെ കണ്ടെത്തി അവരുടെ ലഭ്യത പരിശോധിക്കാൻ റിക്വസ്റ്റ് അയക്കുക."
                  : "Send your first availability ping from the Search page to get responses from verified crew."}
              </p>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                <Link href="/organizer/search">
                  <Search className="w-4 h-4 mr-1.5" />
                  {isMalayalam ? "ക്രൂവിനെ കണ്ടെത്തുക" : "Search Crew Now"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((req) => {
                const crewPings = req.crewPings || [];
                const isNoResponseOverall = req.status === "no_response";

                return (
                  <div
                    key={req.id}
                    id={req.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs hover:border-border/80 transition-all"
                  >
                    {/* Header */}
                    <div className="p-6 bg-muted/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-foreground">{req.role}</h2>
                          {req.specialisation && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                              {req.specialisation}
                            </span>
                          )}
                          <StatusBadge status={req.status} type="booking" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <strong>{isMalayalam ? "തീയതി:" : "Date:"}</strong> {formatDate(req.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <strong>{isMalayalam ? "സ്ഥലം:" : "Location:"}</strong> {req.location}
                          </span>
                          <span>
                            <strong>{isMalayalam ? "തരം:" : "Type:"}</strong> {req.workType}
                          </span>
                          <span>
                            <strong>{isMalayalam ? "അയച്ചത്:" : "Sent:"}</strong> {formatDate(req.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs bg-card border border-border px-3 py-1.5 rounded-xl font-medium">
                          {crewPings.length} {isMalayalam ? "ടെക്നീഷ്യൻമാരെ ബന്ധപ്പെട്ടു" : "crew pinged"}
                        </span>
                      </div>
                    </div>

                    {/* Notes if present */}
                    {req.notes && (
                      <div className="px-6 py-2.5 bg-muted/10 border-b border-border/50 text-xs text-muted-foreground italic">
                        &ldquo;{req.notes}&rdquo;
                      </div>
                    )}

                    {/* No-Response Advice Warning if 2hr window elapsed without replies */}
                    {isNoResponseOverall && (
                      <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-amber-300">
                            {isMalayalam
                              ? "പ്രതികരണ വിൻഡോ പൂർത്തിയായി"
                              : "No responses within the 2-hour response window"}
                          </p>
                          <p className="text-[11px] text-amber-200/80">
                            {isMalayalam
                              ? "ഈ തീയതിയിൽ ടെക്നീഷ്യൻമാർ തിരക്കിലായേക്കാം. സമീപ ജില്ലകളിൽ നിന്നുള്ള ക്രൂവിനെ ഉൾപ്പെടുത്തുകയോ കൂടുതൽ വിഭാഗങ്ങളിൽ നിന്നുള്ളവരെ തിരയുകയോ ചെയ്യുക."
                              : "Technicians may be booked on this date. We recommend widening your search radius to neighbouring districts or trying adjacent specialisations."}
                          </p>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-2 text-[11px] h-7 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                          >
                            <Link href={`/organizer/search?role=${encodeURIComponent(req.role)}`}>
                              <Search className="w-3 h-3 mr-1" />
                              Widen Search Radius
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Crew Pings Table / List */}
                    <div className="p-6 divide-y divide-border/60">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        {isMalayalam ? "ബന്ധപ്പെട്ട ക്രൂ പട്ടിക" : "Crew Response Status"}
                      </h3>

                      {crewPings.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 italic">
                          No ping records available for this request.
                        </p>
                      ) : (
                        crewPings.map((ping, i) => {
                          const isAccepted = ping.status === "accepted";
                          const isDeclined = ping.status === "declined" || ping.status === "rejected";
                          const isPending = ping.status === "pending";
                          const isNoResp = ping.status === "no_response";
                          const isConfirmed = ping.status === "confirmed_match";

                          const phoneDigits = String(ping.phone || ping.crewId).replace(/\D/g, "");

                          return (
                            <div
                              key={i}
                              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/organizer/crew/${ping.crewId}`}
                                    className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                                  >
                                    {ping.name || "Technician"}
                                  </Link>
                                  <span className="text-xs text-muted-foreground">
                                    ({ping.role || req.role})
                                  </span>

                                  {/* Response Status Badge */}
                                  {isAccepted && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Accepted & Available
                                    </span>
                                  )}
                                  {isConfirmed && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md">
                                      <UserCheck className="w-3 h-3" />
                                      Confirmed Match
                                    </span>
                                  )}
                                  {isDeclined && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-400/10 border border-rose-400/25 px-2 py-0.5 rounded-md">
                                      <XCircle className="w-3 h-3" />
                                      Declined
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3" />
                                      Pending Response
                                    </span>
                                  )}
                                  {isNoResp && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                      No Response (Window Ended)
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                  {ping.city && <span>{ping.city}</span>}
                                  {ping.pingedAt && (
                                    <span>Pinged at {new Date(ping.pingedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions on Accepted / Matched Crew */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isAccepted && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirmMatch(req.id, ping)}
                                      disabled={confirmingId === `${req.id}_${ping.crewId}`}
                                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-8"
                                    >
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      Confirm Match
                                    </Button>

                                    <a
                                      href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hi ${ping.name}, following up on your accepted availability on CrewHive for the gig on ${req.date}.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                      title="Chat on WhatsApp"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </a>
                                  </>
                                )}

                                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                  <Link href={`/organizer/crew/${ping.crewId}`}>
                                    View Profile
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

