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

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  UserCheck,
  ClipboardList,
  Briefcase,
  Users,
  User,
  RefreshCw,
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

      const res = await apiFetch(`/api/requests/list?phone=${phoneParam}`, {
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
      const res = await apiFetch(`/api/requests/${requestId}`, {
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

        {/* Page Hero Header */}
        <div className="bg-gradient-to-b from-card via-card to-background border-b border-border/80">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    {isMalayalam ? "ലൈവ് ട്രാക്കിംഗ്" : "Live Ping Tracking"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
                    {refreshing ? "Updating..." : "10s auto-refresh active"}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {isMalayalam ? "ലഭ്യതാ അഭ്യർത്ഥനകൾ" : "Availability Requests"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  {isMalayalam
                    ? "ക്രൂവിലേക്ക് അയച്ച എല്ലാ ലൈവ് റിക്വസ്റ്റുകളും അവയുടെ തത്സമയ പ്രതികരണങ്ങളും ഇവിടെ ട്രാക്ക് ചെയ്യാം."
                    : "Track live responses across WhatsApp and Web as technicians accept or decline your gigs."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  asChild
                  className="bg-primary text-zinc-950 font-bold hover:bg-primary/90 text-xs shadow-xs h-9 px-4 transition-all"
                >
                  <Link href="/organizer/search">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    {isMalayalam ? "ക്രൂവിനെ തിരയുക" : "New Search"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Aggregate Counts Strip - Clean 5 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Total Requests */}
            <div className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                <span className="font-medium text-muted-foreground">
                  {isMalayalam ? "ആകെ അയച്ചവ" : "Total Sent"}
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {aggregate.totalRequests}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isMalayalam ? "ക്രൂവിലേക്ക് അയച്ചവ" : "Pings dispatched"}
                </p>
              </div>
            </div>

            {/* Pending Responses */}
            <div className="bg-card border border-border hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                <span className="font-medium text-amber-400">
                  {isMalayalam ? "മറുപടി കാത്തിരിക്കുന്നവ" : "Pending"}
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
                  {aggregate.pendingResponses}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isMalayalam ? "പ്രതികരണത്തിനായി കാക്കുന്നു" : "Awaiting response"}
                </p>
              </div>
            </div>

            {/* Accepted Responses */}
            <div className="bg-card border border-border hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                <span className="font-medium text-emerald-400">
                  {isMalayalam ? "സ്വീകരിച്ചവ" : "Accepted"}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {aggregate.acceptedResponses}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isMalayalam ? "ലഭ്യമാണെന്ന് അറിയിച്ചവർ" : "Available to book"}
                </p>
              </div>
            </div>

            {/* Declined Responses */}
            <div className="bg-card border border-border hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                <span className="font-medium text-rose-400">
                  {isMalayalam ? "നിരസിച്ചവ" : "Declined"}
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
                  {aggregate.declinedResponses}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isMalayalam ? "തിരക്കിലായ ക്രൂ" : "Unavailable for gig"}
                </p>
              </div>
            </div>

            {/* No Response */}
            <div className="bg-card border border-border hover:border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-xs transition-all col-span-2 sm:col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                <span className="font-medium text-muted-foreground">
                  {isMalayalam ? "പ്രതികരണമില്ലാത്തവ" : "No Response"}
                </span>
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-muted-foreground tracking-tight">
                  {aggregate.noResponses}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isMalayalam ? "2 മണിക്കൂർ കഴിഞ്ഞവ" : "Expired 2hr window"}
                </p>
              </div>
            </div>
          </div>

          {/* Requests List */}
          {requests.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isMalayalam ? "അഭ്യർത്ഥനകൾ ഒന്നും അയച്ചിട്ടില്ല" : "No Availability Requests Yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isMalayalam
                  ? "ടെക്നീഷ്യൻമാരെ കണ്ടെത്തി അവരുടെ ലഭ്യത പരിശോധിക്കാൻ റിക്വസ്റ്റ് അയക്കുക."
                  : "Send your first availability ping from the Search page to get responses from verified crew."}
              </p>
              <Button asChild className="bg-primary text-zinc-950 font-bold hover:bg-primary/90 text-xs">
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
                    <div className="p-5 sm:p-6 bg-muted/20 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                            {req.role}
                          </h2>
                          {req.specialisation && (
                            <span className="text-xs bg-muted/80 text-muted-foreground px-2.5 py-0.5 rounded-md font-medium border border-border/50">
                              {req.specialisation}
                            </span>
                          )}
                          <StatusBadge status={req.status} type="booking" />
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>{isMalayalam ? "തീയതി:" : "Date:"}</span>
                            <strong className="text-foreground">{formatDate(req.date)}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span>{isMalayalam ? "സ്ഥലം:" : "Location:"}</span>
                            <strong className="text-foreground">{req.location}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-primary" />
                            <span>{isMalayalam ? "തരം:" : "Type:"}</span>
                            <strong className="text-foreground">{req.workType || "Standard"}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{isMalayalam ? "അയച്ചത്:" : "Sent:"}</span>
                            <span className="text-foreground">{formatDate(req.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs bg-card border border-border text-foreground px-3.5 py-1.5 rounded-xl font-medium inline-flex items-center gap-1.5 shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {crewPings.length} {isMalayalam ? "ടെക്നീഷ്യൻമാരെ ബന്ധപ്പെട്ടു" : "crew pinged"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Notes if present */}
                    {req.notes && (
                      <div className="px-6 py-2.5 bg-muted/10 border-b border-border/50 text-xs text-muted-foreground flex items-center gap-2 italic">
                        <MessageSquare className="w-3.5 h-3.5 text-primary/70 shrink-0 not-italic" />
                        <span>&ldquo;{req.notes}&rdquo;</span>
                      </div>
                    )}

                    {/* Crew Pings Table / List */}
                    <div className="divide-y divide-border/60">
                      <div className="px-6 py-3.5 bg-muted/15 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {isMalayalam ? "ബന്ധപ്പെട്ട ക്രൂ പട്ടിക" : "Crew Response Status"}
                          </h3>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {crewPings.length} {crewPings.length === 1 ? "technician" : "technicians"}
                        </span>
                      </div>

                      {crewPings.length === 0 ? (
                        <p className="p-6 text-xs text-muted-foreground italic">
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
                              className="p-4 sm:p-5 hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3.5">
                                {/* Avatar Initials Circle */}
                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                                  {(ping.name || "T").charAt(0).toUpperCase()}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                      href={`/organizer/crew/${ping.crewId}`}
                                      className="font-bold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
                                    >
                                      {ping.name || "Technician"}
                                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                    </Link>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      ({ping.role || req.role})
                                    </span>

                                    {/* Response Status Badge */}
                                    {isAccepted && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Accepted & Available
                                      </span>
                                    )}
                                    {isConfirmed && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Confirmed Match
                                      </span>
                                    )}
                                    {isDeclined && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full">
                                        <XCircle className="w-3.5 h-3.5" />
                                        Declined
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                                        <Clock className="w-3.5 h-3.5" />
                                        Pending Response
                                      </span>
                                    )}
                                    {isNoResp && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border border-border/50 px-2.5 py-0.5 rounded-full">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        No Response (Window Ended)
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    {ping.city && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                        {ping.city}
                                      </span>
                                    )}
                                    {ping.pingedAt && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        Pinged at {new Date(ping.pingedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions on Accepted / Matched Crew */}
                              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                                {isAccepted && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirmMatch(req.id, ping)}
                                      disabled={confirmingId === `${req.id}_${ping.crewId}`}
                                      className="bg-primary hover:bg-primary/90 text-zinc-950 font-bold text-xs h-8 px-3.5 shadow-xs transition-all"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                      Confirm Match
                                    </Button>

                                    <a
                                      href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hi ${ping.name}, following up on your accepted availability on CrewHive for the gig on ${req.date}.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-flex items-center justify-center shadow-xs"
                                      title="Chat on WhatsApp"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </a>
                                  </>
                                )}

                                {/* View Profile Button with bulletproof hover styling */}
                                <Button
                                  asChild
                                  size="sm"
                                  className="h-8 px-3.5 text-xs font-semibold bg-zinc-900/90 hover:bg-primary text-zinc-200 hover:text-zinc-950 border border-zinc-700/80 hover:border-primary transition-all duration-150 shadow-xs inline-flex items-center gap-1.5"
                                >
                                  <Link href={`/organizer/crew/${ping.crewId}`}>
                                    <User className="w-3.5 h-3.5" />
                                    <span>View Profile</span>
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* No-Response Advice Warning if 2hr window elapsed without replies */}
                    {isNoResponseOverall && (
                      <div className="p-4 sm:p-5 bg-amber-500/10 border-t border-amber-500/20 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-amber-300 text-sm">
                              {isMalayalam
                                ? "പ്രതികരണ വിൻഡോ പൂർത്തിയായി"
                                : "No responses within the 2-hour response window"}
                            </p>
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                              {isMalayalam
                                ? "ഈ തീയതിയിൽ ടെക്നീഷ്യൻമാർ തിരക്കിലായേക്കാം. സമീപ ജില്ലകളിൽ നിന്നുള്ള ക്രൂവിനെ ഉൾപ്പെടുത്തുകയോ കൂടുതൽ വിഭാഗങ്ങളിൽ നിന്നുള്ളവരെ തിരയുകയോ ചെയ്യുക."
                                : "Technicians may be booked on this date. We recommend widening your search radius to neighbouring districts or trying adjacent specialisations."}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs h-8 px-3.5 shrink-0 transition-colors shadow-xs"
                        >
                          <Link href={`/organizer/search?role=${encodeURIComponent(req.role)}`}>
                            <Search className="w-3.5 h-3.5 mr-1.5" />
                            {isMalayalam ? "തിരച്ചിൽ വിപുലീകരിക്കുക" : "Widen Search Radius"}
                          </Link>
                        </Button>
                      </div>
                    )}
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
