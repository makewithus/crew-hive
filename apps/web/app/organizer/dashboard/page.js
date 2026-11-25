/**
 * /app/organizer/dashboard/page.js
 * Recruiter / Organizer Dashboard
 *
 * Implements Prompt 3 Section 4:
 * A. Overview (Welcome, Company/Individual name, City, Search CTA)
 * B. Request overview with genuine backend data (Total requests sent, Pending, Accepted, Declined, No response)
 * C. Recent activity (Recent requests, crew responses, notifications)
 * D. Functional empty states and Quick Action CTAs
 * E. Feature Access / Trial status banner (Section 14)
 */

"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import {
  Search,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Bookmark,
  Calendar,
  CalendarCheck,
  Building2,
  MapPin,
  ArrowRight,
  Send,
  BellRing,
  Briefcase,
} from "lucide-react";

export default function OrganizerDashboardPage() {
  const { currentUser, userPhone: authPhone } = useAuth();
  const router = useRouter();
  const { isMalayalam } = useLanguage();

  const userPhone =
    authPhone ||
    (typeof window !== "undefined" ? sessionStorage.getItem("crewhive_user_phone") : null);

  const [organizer, setOrganizer] = useState(null);
  const [requests, setRequests] = useState([]);
  const [aggregate, setAggregate] = useState({
    totalRequests: 0,
    pendingResponses: 0,
    acceptedResponses: 0,
    declinedResponses: 0,
    noResponses: 0,
  });
  const [featureConfig, setFeatureConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, [currentUser, userPhone]);

  const loadDashboardData = async (isRefresh = false) => {
    const activePhone =
      userPhone ||
      currentUser?.phoneNumber ||
      (typeof window !== "undefined" ? sessionStorage.getItem("crewhive_user_phone") : "") ||
      "";

    if (!currentUser && !activePhone) {
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const phoneParam = encodeURIComponent(activePhone);

      // 1. Fetch Recruiter Profile
      const profileRes = await apiFetch(`/api/organizer/profile?phone=${phoneParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const profileJson = await profileRes.json();

      if (profileJson.success && profileJson.data) {
        setOrganizer(profileJson.data);
      } else {
        router.push("/organizer/setup");
        return;
      }

      // 2. Fetch Availability Requests & Aggregates (Genuine backend data)
      const requestsRes = await apiFetch(`/api/requests/list?phone=${phoneParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const requestsJson = await requestsRes.json();

      if (requestsJson.success) {
        setRequests(requestsJson.data || []);
        if (requestsJson.aggregate) {
          setAggregate(requestsJson.aggregate);
        }
      }

      // 3. Fetch Feature Access configuration
      try {
        const featRes = await apiFetch("/api/features");
        const featJson = await featRes.json();
        if (featJson.success) {
          setFeatureConfig(featJson.data);
        }
      } catch (_) {}
    } catch (err) {
      console.error("[RecruiterDashboard] load error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground text-sm font-medium">
              {isMalayalam ? "ഡാഷ്‌ബോർഡ് ലോഡ് ചെയ്യുന്നു..." : "Loading dashboard..."}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const companyTitle = organizer?.companyName || organizer?.name || "Organizer";
  const cityDisplay = organizer?.city || "Kerala";

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-7 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                    {isMalayalam ? "റിക്രൂട്ടർ പോർട്ടൽ" : "Recruiter Portal"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3 text-primary" />
                    {cityDisplay}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {isMalayalam ? "സ്വാഗതം" : "Welcome back"},{" "}
                  <span className="text-primary">{companyTitle}</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {isMalayalam
                    ? "കേരളത്തിലെ ലൈവ് ഇവന്റ് & മീഡിയ ടെക്നീഷ്യൻമാരെ കണ്ടെത്തുക"
                    : "Discover verified AV technicians & send availability requests across Kerala."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-sm gap-2"
                >
                  <Link href="/organizer/search">
                    <Search className="w-4 h-4" />
                    {isMalayalam ? "ക്രൂവിനെ തിരയുക" : "Search Crew"}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="text-xs font-semibold gap-2 border-border bg-card/60 hover:bg-primary hover:text-black hover:border-primary transition-all"
                >
                  <Link href="/organizer/prebookings">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    {isMalayalam ? "തീയതി ഹോൾഡുകൾ" : "Date Holds"}
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

          {/* ── SECTION B: REQUEST OVERVIEW (GENUINE BACKEND METRICS) ─────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                {isMalayalam ? "അഭ്യർത്ഥനകളുടെ ചുരുക്കം" : "Request Overview"}
              </h2>
              <Link
                href="/organizer/requests"
                className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 group"
              >
                <span>{isMalayalam ? "എല്ലാ അഭ്യർത്ഥനകളും കാണുക" : "View All Requests"}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Total Requests */}
              <div className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                  <span className="font-medium">{isMalayalam ? "ആകെ അയച്ചവ" : "Total Requests"}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {aggregate.totalRequests}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isMalayalam ? "ക്രൂവിലേക്ക് അയച്ചവ" : "Sent to technicians"}
                  </p>
                </div>
              </div>

              {/* Pending Responses */}
              <div className="bg-card border border-border hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                  <span className="font-medium text-amber-400">{isMalayalam ? "മറുപടി കാത്തിരിക്കുന്നവ" : "Pending Responses"}</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
                    {aggregate.pendingResponses}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isMalayalam ? "പ്രതികരണത്തിനായി കാക്കുന്നു" : "Awaiting crew reply"}
                  </p>
                </div>
              </div>

              {/* Accepted Responses */}
              <div className="bg-card border border-border hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                  <span className="font-medium text-emerald-400">{isMalayalam ? "സ്വീകരിച്ചവ" : "Accepted"}</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                    {aggregate.acceptedResponses}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isMalayalam ? "തയ്യാറാണെന്ന് അറിയിച്ചവർ" : "Confirmed available"}
                  </p>
                </div>
              </div>

              {/* Declined Responses */}
              <div className="bg-card border border-border hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
                  <span className="font-medium text-rose-400">{isMalayalam ? "നിരസിച്ചവ" : "Declined"}</span>
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
                  <span className="font-medium">{isMalayalam ? "പ്രതികരണമില്ലാത്തവ" : "No Response"}</span>
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-muted-foreground tracking-tight">
                    {aggregate.noResponses}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isMalayalam ? "വിൻഡോ കഴിഞ്ഞവ" : "Expired 2hr window"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/organizer/search"
              className="group p-5 bg-card border border-border hover:border-primary/50 rounded-2xl transition-all shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                    {isMalayalam ? "ക്രൂവിനെ കണ്ടെത്തുക" : "Search Available Crew"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isMalayalam ? "റോൾ, നഗരം അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക" : "Filter by 10 AV parent roles & districts"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/organizer/shortlist"
              className="group p-5 bg-card border border-border hover:border-primary/50 rounded-2xl transition-all shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                    {isMalayalam ? "സേവ് ചെയ്ത ക്രൂ" : "Saved Shortlist"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isMalayalam ? "ഭാവി ആവശ്യങ്ങൾക്കായി ബുക്ക്‌മാർക്ക് ചെയ്തവർ" : "Access your bookmarked technicians"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/organizer/shows"
              className="group p-5 bg-card border border-border hover:border-primary/50 rounded-2xl transition-all shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                    {isMalayalam ? "ഇവന്റ് ക്രൂ ലിസ്റ്റുകൾ" : "Crew For This Show"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isMalayalam ? "ഇവന്റുകൾ തിരിച്ച് റോൾ ക്രമീകരിക്കുക" : "Organize complete event crew rosters"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/organizer/prebookings"
              className="group p-5 bg-card border border-border hover:border-primary/50 rounded-2xl transition-all shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                    {isMalayalam ? "തീയതി ഹോൾഡുകൾ" : "Pre-Bookings & Holds"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isMalayalam ? "48 മണിക്കൂർ മുൻകൂട്ടി റിസർവ് ചെയ്യുക" : "Manage 48-hour temporary date holds"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </section>

          {/* ── SECTION C & D: RECENT ACTIVITY & EMPTY STATE ───────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4 text-primary" />
                {isMalayalam ? "സമീപകാല പ്രവർത്തനങ്ങൾ" : "Recent Activity & Requests"}
              </h2>
              {requests.length > 0 && (
                <Link
                  href="/organizer/requests"
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  {isMalayalam ? "എല്ലാം കാണുക" : "View all"} ({requests.length})
                </Link>
              )}
            </div>

            {requests.length === 0 ? (
              /* D. Meaningful Empty State */
              <div className="bg-card border border-border rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isMalayalam
                      ? "നിങ്ങൾ ഇതുവരെ അഭ്യർത്ഥനകൾ ഒന്നും അയച്ചിട്ടില്ല"
                      : "You haven't sent any crew requests yet"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {isMalayalam
                      ? "നിങ്ങളുടെ പ്രോജക്റ്റിനായി ടെക്നീഷ്യൻമാരെ തിരഞ്ഞ് റിക്വസ്റ്റ് അയച്ചുതുടങ്ങുക."
                      : "Search for sound, lighting, camera, or stage technicians across Kerala to get started."}
                  </p>
                </div>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold">
                  <Link href="/organizer/search">
                    <Search className="w-4 h-4 mr-2" />
                    {isMalayalam ? "ടെക്നീഷ്യൻമാരെ തിരയുക" : "Search for Technicians"}
                  </Link>
                </Button>
              </div>
            ) : (
              /* Recent Requests List */
              <div className="space-y-3.5">
                {requests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="bg-card border border-border hover:border-border/90 rounded-2xl p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-base text-foreground">
                          {req.role}
                        </span>
                        {req.specialisation && (
                          <span className="text-xs bg-muted/80 border border-border px-2.5 py-0.5 rounded-full text-muted-foreground font-medium">
                            {req.specialisation}
                          </span>
                        )}
                        <StatusBadge status={req.status} type="booking" />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{formatDate(req.date)}</span>
                        </span>
                        {req.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{req.location}</span>
                          </span>
                        )}
                        {req.workType && (
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{req.workType}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-[11px] opacity-75">
                          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{formatDate(req.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 self-start md:self-center">
                      <div className="text-left md:text-right text-xs">
                        <div className="font-semibold text-foreground">
                          {req.crewPings?.length || 0}{" "}
                          {isMalayalam ? "പേരെ ബന്ധപ്പെട്ടു" : "crew contacted"}
                        </div>
                        <div className="text-[11px] font-medium text-emerald-400 flex items-center md:justify-end gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span>
                            {req.acceptedCount || 0} {isMalayalam ? "സ്വീകരിച്ചു" : "accepted"}
                          </span>
                        </div>
                      </div>

                      <Button
                        asChild
                        size="sm"
                        className="h-8.5 px-3.5 text-xs font-semibold bg-secondary hover:bg-primary text-foreground hover:text-black border border-border hover:border-primary transition-all duration-150 shadow-xs"
                      >
                        <Link href={`/organizer/requests#${req.id}`}>
                          {isMalayalam ? "ട്രാക്ക് ചെയ്യുക" : "Track Responses"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
