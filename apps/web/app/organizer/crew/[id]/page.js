/**
 * /app/organizer/crew/[id]/page.js
 * Comprehensive Public Crew Profile Page
 *
 * Implements Prompt 3 Section 8:
 * - Basic info (Name, profile photo, city/district, professional roles)
 * - Professional details (Specialisations, experience, languages, bio)
 * - Portfolio links (Instagram, YouTube, Google Drive, website)
 * - Past credits (Production/event name, role, year)
 * - Equipment list (gear owned & operated)
 * - Public/Private rate visibility enforcement (Never exposes private rates)
 * - Availability status (Never exposes exact coordinates)
 * - Direct contact actions: WhatsApp deep link, Phone call, Send Availability Request
 * - Shortlist & Report profile actions
 */

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getCrewProfile } from "@/lib/firestore";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  Languages,
  IndianRupee,
  Phone,
  MessageSquare,
  Send,
  Bookmark,
  ShieldCheck,
  Video,
  Instagram,
  Youtube,
  HardDrive,
  ExternalLink,
  Briefcase,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewProfilePage({ params }) {
  const { id: rawCrewId } = use(params);
  const crewId = String(rawCrewId || "").replace(/\D/g, "");

  const router = useRouter();
  const { currentUser, userPhone } = useAuth();
  const { isMalayalam } = useLanguage();

  const [crew, setCrew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isShortlisted, setIsShortlisted] = useState(false);

  // Availability Request Form Modal
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDate, setRequestDate] = useState("");
  const [requestLocation, setRequestLocation] = useState("");
  const [requestWorkType, setRequestWorkType] = useState("Live Event");
  const [requestNotes, setRequestNotes] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Report Profile Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("unprofessional_conduct");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadCrewData();
  }, [crewId]);

  const loadCrewData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getCrewProfile(crewId);
      if (res.success && res.data) {
        setCrew(res.data);
        if (res.data.city) setRequestLocation(res.data.city);
      } else {
        setError(res.error || "Crew member not found");
      }

      // Check if already shortlisted
      try {
        const slRes = await fetch(`/api/recruiter/shortlist?phone=${userPhone}`);
        const slJson = await slRes.json();
        if (slJson.success && Array.isArray(slJson.data)) {
          setIsShortlisted(slJson.data.some((item) => item.id === crewId));
        }
      } catch (_) {}
    } catch (err) {
      setError(err.message || "Failed to load crew profile");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortlist = async () => {
    try {
      if (isShortlisted) {
        const res = await fetch(`/api/recruiter/shortlist?crewId=${crewId}&phone=${userPhone}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setIsShortlisted(false);
          toast.success("Removed from shortlist");
        }
      } else {
        const res = await fetch("/api/recruiter/shortlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crewId,
            name: crew?.name,
            role: crew?.role,
            city: crew?.city,
            recruiterPhone: userPhone,
          }),
        });
        if (res.ok) {
          setIsShortlisted(true);
          toast.success("Saved to shortlist");
        }
      }
    } catch (_) {
      toast.error("Could not update shortlist");
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestDate || !requestLocation || !requestWorkType) {
      toast.error("Please fill in event date and location.");
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: crew?.role || "Technician",
          specialisation: crew?.specialisations?.[0] || "",
          date: requestDate,
          location: requestLocation,
          workType: requestWorkType,
          notes: requestNotes,
          targetCrewIds: [crewId],
          recruiterPhone: userPhone,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send request.");
      }

      toast.success("Availability request sent! The technician has been notified via WhatsApp.");
      setShowRequestForm(false);
      setRequestNotes("");
    } catch (err) {
      toast.error(err.message || "Error submitting request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedProfileId: crewId,
          reporterPhone: userPhone || "recruiter",
          reason: reportReason,
          details: reportDetails,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Report submitted to CrewHive moderators. Thank you.");
        setShowReportModal(false);
        setReportDetails("");
      } else {
        toast.error(json.error || "Failed to submit report.");
      }
    } catch (_) {
      toast.error("Network error submitting report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !crew) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Profile Unavailable</h2>
            <p className="text-sm text-muted-foreground">{error || "Crew member not found."}</p>
            <Button asChild className="w-full">
              <Link href="/organizer/search">Return to Search</Link>
            </Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Rate Visibility: Only display when explicitly allowed
  const hasPublicRate =
    crew.showRate !== false &&
    crew.rateVisibility !== "private" &&
    crew.ratePerDay != null &&
    Number(crew.ratePerDay) > 0;

  const phoneDigits = String(crew.phone || crewId).replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
    `Hello ${crew.name || "there"}, I found your profile on CrewHive and would like to check your availability for an upcoming gig.`
  )}`;
  const telUrl = `tel:+${phoneDigits}`;

  const portfolio = crew.portfolioLinks || {};
  const pastCredits = Array.isArray(crew.pastCredits) ? crew.pastCredits : [];
  const equipment = Array.isArray(crew.equipmentOwned)
    ? crew.equipmentOwned
    : crew.equipment
    ? [crew.equipment]
    : [];

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 w-full space-y-8">
          {/* Back & Breadcrumb navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/organizer/search"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isMalayalam ? "തിരയലിലേക്ക് മടങ്ങുക" : "Back to Search"}
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                {isMalayalam ? "പ്രൊഫൈൽ റിപ്പോർട്ട് ചെയ്യുക" : "Report"}
              </button>
              <LanguageToggle compact />
            </div>
          </div>

          {/* ── BASIC INFORMATION HERO CARD ──────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="h-32 bg-linear-to-r from-primary/20 via-primary/5 to-transparent border-b border-border/50" />

            <div className="px-6 sm:px-8 pb-8 -mt-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
                <div className="flex items-end gap-5">
                  {crew.profileImage ? (
                    <img
                      src={crew.profileImage}
                      alt={crew.name}
                      className="w-28 h-28 rounded-2xl object-cover border-4 border-card shadow-md shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-primary/10 border-4 border-card flex items-center justify-center shrink-0 text-3xl font-extrabold text-primary shadow-md">
                      {crew.name ? crew.name[0].toUpperCase() : "C"}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                        {crew.name || "Technician"}
                      </h1>
                      {crew.associationMember && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {crew.associationName || "Verified Member"}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-primary">
                      {crew.role || "AV Technician"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {crew.city || "Kerala"}
                      </span>
                      {crew.experience && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {crew.experience}
                        </span>
                      )}
                      {crew.travelRange && (
                        <span>Willing to travel: {crew.travelRange}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status + Shortlist toggle */}
                <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                  {crew.available ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Available Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      Busy / Unavailable
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleShortlist}
                    className={`gap-1.5 text-xs ${
                      isShortlisted
                        ? "border-primary text-primary bg-primary/5"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? "fill-primary" : ""}`} />
                    {isShortlisted ? "Shortlisted" : "Save to Shortlist"}
                  </Button>
                </div>
              </div>

              {/* ── CONTACT & AVAILABILITY REQUEST ACTIONS ───────────────────── */}
              <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
                {/* Rate Section */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    {isMalayalam ? "പ്രതിദിന വേതനം" : "Day Rate"}
                  </span>
                  {hasPublicRate ? (
                    <div className="flex items-baseline gap-1">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <span className="text-2xl font-black text-primary">
                        {Number(crew.ratePerDay).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-foreground">/ day</span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground italic">
                      {isMalayalam ? "ആവശ്യാനുസരണം ലഭ്യമാകും" : "Rate on request"}
                    </span>
                  )}
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* WhatsApp Deep Link */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </a>

                  {/* Phone Call Action */}
                  <a
                    href={telUrl}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground font-semibold text-xs transition-colors"
                  >
                    <Phone className="w-4 h-4 text-primary" />
                    Call
                  </a>

                  {/* Send Availability Request */}
                  <Button
                    onClick={() => setShowRequestForm(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs gap-2 px-5 py-2.5"
                  >
                    <Send className="w-4 h-4" />
                    {isMalayalam ? "ലഭ്യത റിക്വസ്റ്റ് അയയ്ക്കുക" : "Send Availability Request"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── LEFT 2 COLS: BIO, SPECIALISATIONS, CREDITS, GEAR ────────────── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              {crew.bio && (
                <section className="bg-card border border-border rounded-2xl p-6 space-y-3">
                  <h2 className="text-base font-bold text-foreground">
                    {isMalayalam ? "വിവരണം" : "About"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {crew.bio}
                  </p>
                </section>
              )}

              {/* Specialisations */}
              {Array.isArray(crew.specialisations) && crew.specialisations.length > 0 && (
                <section className="bg-card border border-border rounded-2xl p-6 space-y-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {isMalayalam ? "സ്പെഷ്യലൈസേഷനുകൾ" : "Specialisations & Roles"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {crew.specialisations.map((spec, i) => (
                      <span
                        key={i}
                        className="bg-muted text-foreground border border-border px-3 py-1 rounded-xl text-xs font-semibold"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Past Credits */}
              {pastCredits.length > 0 && (
                <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    {isMalayalam ? "മുൻകാല പ്രോജക്റ്റുകൾ" : "Past Credits & Shows"}
                  </h2>
                  <div className="divide-y divide-border/60">
                    {pastCredits.map((credit, i) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {credit.productionName || credit.eventName || credit.title || "Production"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {credit.role || crew.role}
                          </p>
                        </div>
                        {credit.year && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {credit.year}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Equipment Owned */}
              {equipment.length > 0 && (
                <section className="bg-card border border-border rounded-2xl p-6 space-y-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    {isMalayalam ? "ഉപകരണങ്ങൾ" : "Equipment Owned & Gear"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {equipment.map((item, i) => (
                      <span
                        key={i}
                        className="bg-muted text-foreground border border-border px-3 py-1.5 rounded-xl text-xs font-medium"
                      >
                        {typeof item === "string" ? item : item.name || item.model}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ── RIGHT COLUMN: PORTFOLIO & LANGUAGES ─────────────────────────── */}
            <div className="space-y-6">
              {/* Portfolio & Links */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground">
                  {isMalayalam ? "പോർട്ട്ഫോളിയോ ലിങ്കുകൾ" : "Portfolio & Links"}
                </h3>

                <div className="space-y-2.5">
                  {portfolio.instagram && (
                    <a
                      href={portfolio.instagram.startsWith("http") ? portfolio.instagram : `https://instagram.com/${portfolio.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-400" />
                        Instagram
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}

                  {portfolio.youtube && (
                    <a
                      href={portfolio.youtube.startsWith("http") ? portfolio.youtube : `https://youtube.com/${portfolio.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-red-500" />
                        YouTube Reel
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}

                  {portfolio.googleDrive && (
                    <a
                      href={portfolio.googleDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-blue-400" />
                        Google Drive Work
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}

                  {crew.portfolioLink && !portfolio.instagram && !portfolio.youtube && !portfolio.googleDrive && (
                    <a
                      href={crew.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        Work Portfolio Link
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}

                  {!portfolio.instagram && !portfolio.youtube && !portfolio.googleDrive && !crew.portfolioLink && (
                    <p className="text-xs text-muted-foreground italic">
                      No public links provided yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Languages Known */}
              {Array.isArray(crew.languages) && crew.languages.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Languages className="w-4 h-4 text-primary" />
                    {isMalayalam ? "അറിയാവുന്ന ഭാഷകൾ" : "Languages Known"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {crew.languages.map((l, i) => (
                      <span
                        key={i}
                        className="bg-muted px-2.5 py-1 rounded-lg text-xs font-medium text-foreground"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MODAL: SEND AVAILABILITY REQUEST ──────────────────────────────── */}
        {showRequestForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <button
                onClick={() => setShowRequestForm(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isMalayalam ? "ലഭ്യത റിക്വസ്റ്റ് അയയ്ക്കുക" : "Send Availability Request"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    To: <strong>{crew.name}</strong> ({crew.role})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {isMalayalam ? "ഇവന്റ് തീയതി *" : "Work / Event Date *"}
                  </label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="bg-muted text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {isMalayalam ? "സ്ഥലം / വേദി *" : "Work Location / Venue *"}
                  </label>
                  <Input
                    type="text"
                    value={requestLocation}
                    onChange={(e) => setRequestLocation(e.target.value)}
                    placeholder="e.g. JLN Stadium, Kochi"
                    className="bg-muted text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {isMalayalam ? "തൊഴിലിന്റെ തരം *" : "Type of Work *"}
                  </label>
                  <select
                    value={requestWorkType}
                    onChange={(e) => setRequestWorkType(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                  >
                    <option value="Live Concert">Live Concert / സംഗീത കച്ചേരി</option>
                    <option value="Corporate Event">Corporate Event / കോർപ്പറേറ്റ്</option>
                    <option value="Film / Video Shoot">Film / Video Shoot / സിനിമ</option>
                    <option value="Wedding / Celebration">Wedding / വിവാഹം</option>
                    <option value="Stage Show">Stage Show / സ്റ്റേജ് ഷോ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {isMalayalam ? "കുറിപ്പുകൾ (ഓപ്ഷണൽ)" : "Job Notes & Shift Times (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Details about gear required, shift hours, transportation..."
                    className="w-full bg-muted border border-border rounded-xl p-3 text-xs outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRequestForm(false)}
                    className="flex-1 text-xs"
                  >
                    {isMalayalam ? "റദ്ദാക്കുക" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingRequest}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                  >
                    {submittingRequest
                      ? isMalayalam
                        ? "അയയ്ക്കുന്നു..."
                        : "Sending..."
                      : isMalayalam
                      ? "റിക്വസ്റ്റ് സ്ഥിരീകരിക്കുക"
                      : "Send Request"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: REPORT PROFILE ─────────────────────────────────────────── */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" />
                Report Profile
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Help keep CrewHive safe and professional. All reports are reviewed by moderators.
              </p>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Reason *</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs outline-none"
                  >
                    <option value="unprofessional_conduct">Unprofessional conduct / no-show</option>
                    <option value="fake_profile">Fake information or identity theft</option>
                    <option value="inaccurate_rates">Inaccurate rates or misleading portfolio</option>
                    <option value="inappropriate_content">Inappropriate communication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Additional Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide any relevant context..."
                    className="w-full bg-muted border border-border rounded-xl p-3 text-xs outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingReport}
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
                  >
                    {submittingReport ? "Submitting..." : "Submit Report"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
