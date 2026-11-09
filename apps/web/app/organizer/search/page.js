/**
 * /app/organizer/search/page.js
 * Recruiter Crew Search Page
 *
 * Implements Prompt 3 Sections 5, 6, 7:
 * - Parent professional role taxonomy (Lighting, Sound, Rigging, SFX, Camera, Direction, Art, Photo/Video, Post, LED)
 * - Dynamic specialisations under each parent role
 * - Location filter (Kochi, Thiruvananthapuram, Kozhikode, and all Kerala districts loaded from backend)
 * - Available Now filter enforced by backend (excludes busy and auto-expired)
 * - Advanced filters (P1: Languages, Experience, Rate Range) with feature-access gating support
 * - Search state preservation in URL params
 * - Loading, error, empty states, and pagination
 * - Quick "Send Availability Request" modal
 */

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import CrewCard from "@/components/CrewCard";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_ROLES } from "@/utils/constants";
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Clock,
  Layers,
  Send,
  X,
  Lock,
  ChevronDown,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMalayalam } = useLanguage();

  // State from URL or defaults
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [specialisation, setSpecialisation] = useState(searchParams.get("specialisation") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [availableNow, setAvailableNow] = useState(searchParams.get("available") === "true");

  // Advanced P1 Filters
  const [experience, setExperience] = useState(searchParams.get("experience") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [minRate, setMinRate] = useState(searchParams.get("minRate") || "");
  const [maxRate, setMaxRate] = useState(searchParams.get("maxRate") || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data & Taxonomy
  const [rolesTaxonomy, setRolesTaxonomy] = useState([]);
  const [citiesTaxonomy, setCitiesTaxonomy] = useState([]);
  const [featureConfig, setFeatureConfig] = useState(null);

  // Results & Pagination
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Request Modal State
  const [requestModalCrew, setRequestModalCrew] = useState(null);
  const [requestDate, setRequestDate] = useState("");
  const [requestLocation, setRequestLocation] = useState("");
  const [requestWorkType, setRequestWorkType] = useState("Live Concert");
  const [requestNotes, setRequestNotes] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Load backend taxonomy (Roles & Cities)
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const [rolesRes, citiesRes, featRes] = await Promise.all([
          fetch("/api/taxonomy/roles"),
          fetch("/api/taxonomy/cities"),
          fetch("/api/features"),
        ]);
        const rolesJson = await rolesRes.json();
        const citiesJson = await citiesRes.json();
        const featJson = await featRes.json();

        if (rolesJson.success) setRolesTaxonomy(rolesJson.data);
        if (citiesJson.success) setCitiesTaxonomy(citiesJson.data);
        if (featJson.success) setFeatureConfig(featJson.data);
      } catch (err) {
        console.error("Taxonomy load error:", err);
      }
    }
    loadTaxonomy();
  }, []);

  // Sync available specialisations based on selected parent role
  const selectedParentRoleObj = rolesTaxonomy.find(
    (r) => r.id === role || r.nameEn === role
  );
  const availableSpecialisations = selectedParentRoleObj?.specialisations || [];

  // Fetch search results from server
  const executeSearch = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (role) params.set("role", role);
        if (specialisation) params.set("specialisation", specialisation);
        if (city) params.set("city", city);
        if (availableNow) params.set("available", "true");
        if (experience) params.set("experience", experience);
        if (language) params.set("language", language);
        if (minRate) params.set("minRate", minRate);
        if (maxRate) params.set("maxRate", maxRate);
        params.set("page", String(pageToLoad));
        params.set("limit", "18");

        // Preserve URL state
        router.replace(`/organizer/search?${params.toString()}`, { scroll: false });

        const res = await fetch(`/api/crew/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          if (append) {
            setResults((prev) => [...prev, ...json.data]);
          } else {
            setResults(json.data);
          }
          setPagination(json.pagination || { total: json.data.length, page: pageToLoad, hasMore: false });
        } else {
          setError(json.error || "Failed to load crew members");
        }
      } catch (err) {
        setError(err.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [role, specialisation, city, availableNow, experience, language, minRate, maxRate, router]
  );

  // Trigger search on mount and when filters change
  useEffect(() => {
    executeSearch(1, false);
  }, [role, specialisation, city, availableNow, experience, language, minRate, maxRate]);

  const handleResetFilters = () => {
    setRole("");
    setSpecialisation("");
    setCity("");
    setAvailableNow(false);
    setExperience("");
    setLanguage("");
    setMinRate("");
    setMaxRate("");
  };

  // Quick Availability Request Submission
  const handleSendAvailabilityRequest = async (e) => {
    e.preventDefault();
    if (!requestModalCrew) return;
    if (!requestDate || !requestLocation || !requestWorkType) {
      toast.error("Please fill in the required event date and location.");
      return;
    }

    setSendingRequest(true);
    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: requestModalCrew.role,
          specialisation: requestModalCrew.specialisations?.[0] || "",
          date: requestDate,
          location: requestLocation,
          workType: requestWorkType,
          notes: requestNotes,
          targetCrewIds: [requestModalCrew.id],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send request.");
      }

      toast.success(`Availability request sent to ${requestModalCrew.name}!`);
      setRequestModalCrew(null);
      setRequestDate("");
      setRequestLocation("");
      setRequestNotes("");
    } catch (err) {
      toast.error(err.message || "Could not send availability request.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Hero Search Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {isMalayalam ? "ക്രൂവിനെ കണ്ടെത്തുക" : "Search Professional Crew"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isMalayalam
                  ? "ലൈവ് ഇവന്റുകൾക്കും മീഡിയ പ്രൊഡക്ഷനുകൾക്കുമായി കേരളത്തിലെ സാങ്കേതിക വിദഗ്ദ്ധരെ കണ്ടെത്തുക"
                  : "Find vetted sound, lighting, stage, video, and camera technicians across Kerala."}
              </p>
            </div>
            <LanguageToggle compact />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ── LEFT COLUMN: FILTERS ────────────────────────────────────────── */}
          <aside className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  {isMalayalam ? "ഫിൽട്ടറുകൾ" : "Search Filters"}
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {isMalayalam ? "റീസെറ്റ്" : "Reset"}
                </button>
              </div>

              {/* 1. Parent Role Filter */}
              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam ? "പ്രൊഫഷണൽ റോൾ (വിഭാഗം)" : "Professional Role"}
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setSpecialisation("");
                  }}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="">{isMalayalam ? "എല്ലാ റോളുകളും" : "All Parent Roles"}</option>
                  {rolesTaxonomy.map((r) => (
                    <option key={r.id} value={r.nameEn}>
                      {isMalayalam && r.nameMl ? `${r.nameMl} (${r.nameEn})` : r.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Specialisation Filter (Dynamic based on selected parent role) */}
              {availableSpecialisations.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    {isMalayalam ? "സ്പെഷ്യലൈസേഷൻ" : "Specialisation"}
                  </label>
                  <select
                    value={specialisation}
                    onChange={(e) => setSpecialisation(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none"
                  >
                    <option value="">
                      {isMalayalam ? "എല്ലാ സ്പെഷ്യലൈസേഷനുകളും" : "All Specialisations"}
                    </option>
                    {availableSpecialisations.map((spec) => (
                      <option key={spec.id} value={spec.nameEn}>
                        {isMalayalam && spec.nameMl ? `${spec.nameMl} (${spec.nameEn})` : spec.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Location / City Filter */}
              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam ? "നഗരം / ജില്ല" : "Location / District"}
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="">{isMalayalam ? "എല്ലാ നഗരങ്ങളും" : "All Kerala Locations"}</option>
                  {citiesTaxonomy.map((c) => (
                    <option key={c.id || c.nameEn} value={c.nameEn}>
                      {isMalayalam && c.nameMl ? `${c.nameMl} (${c.nameEn})` : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Available Now Toggle */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="text-xs font-bold block group-hover:text-primary transition-colors">
                      {isMalayalam ? "ഇപ്പോൾ ലഭ്യമായവർ മാത്രം" : "Available Now Only"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      {isMalayalam ? "തിരക്കില്ലാത്ത ക്രൂ" : "Exclude busy & expired crew"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={availableNow}
                    onChange={(e) => setAvailableNow(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                </label>
              </div>

              {/* ── ADVANCED FILTERS (P1) ─────────────────────────────────── */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    {isMalayalam ? "കൂടുതൽ ഫിൽട്ടറുകൾ (P1)" : "Advanced Filters (P1)"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-3">
                    {/* Experience Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                        {isMalayalam ? "പരിചയം" : "Experience Level"}
                      </label>
                      <select
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full bg-muted border border-border rounded-xl px-2.5 py-2 text-xs outline-none"
                      >
                        <option value="">{isMalayalam ? "എല്ലാം" : "Any Experience"}</option>
                        <option value="0-2">0–2 years / വർഷം</option>
                        <option value="3-5">3–5 years / വർഷം</option>
                        <option value="5-10">5–10 years / വർഷം</option>
                        <option value="10+">10+ years / വർഷം</option>
                      </select>
                    </div>

                    {/* Language Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                        {isMalayalam ? "ഭാഷ" : "Language"}
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-muted border border-border rounded-xl px-2.5 py-2 text-xs outline-none"
                      >
                        <option value="">{isMalayalam ? "എല്ലാം" : "Any Language"}</option>
                        <option value="ml">Malayalam / മലയാളം</option>
                        <option value="en">English / ഇംഗ്ലീഷ്</option>
                        <option value="ta">Tamil / തമിഴ്</option>
                        <option value="hi">Hindi / ഹിന്ദി</option>
                      </select>
                    </div>

                    {/* Rate Range Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                        {isMalayalam ? "പ്രതിദിന വേതന പരിധി (₹)" : "Day Rate Range (₹)"}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min ₹"
                          value={minRate}
                          onChange={(e) => setMinRate(e.target.value)}
                          className="text-xs bg-muted"
                        />
                        <Input
                          type="number"
                          placeholder="Max ₹"
                          value={maxRate}
                          onChange={(e) => setMaxRate(e.target.value)}
                          className="text-xs bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ── RIGHT COLUMN: RESULTS LIST ──────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isMalayalam ? "കണ്ടെത്തിയത്:" : "Found"}{" "}
                <span className="font-bold text-foreground">{pagination.total}</span>{" "}
                {isMalayalam ? "യോഗ്യതയുള്ള ക്രൂ അംഗങ്ങൾ" : "qualified technicians"}
              </p>

              {availableNow && (
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  Live Available Only
                </span>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeSearch(1)}
                    className="mt-2 text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="bg-card border border-border rounded-2xl p-6 h-56 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-muted rounded-2xl" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              /* No Results State */
              <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isMalayalam
                      ? "യോജിച്ച ക്രൂ അംഗങ്ങളെ കണ്ടെത്താനായില്ല"
                      : "No crew members matched your filters"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isMalayalam
                      ? "ഫിൽട്ടറുകൾ മാറ്റി കൂടുതൽ നഗരങ്ങളിലേക്കോ മറ്റ് കാറ്റഗറികളിലേക്കോ തിരയുക."
                      : "Try loosening your location or role filters, or toggling off 'Available Now' to see busy crew for upcoming dates."}
                  </p>
                </div>
                <Button variant="outline" onClick={handleResetFilters} className="text-xs">
                  {isMalayalam ? "ഫിൽട്ടറുകൾ റീസെറ്റ് ചെയ്യുക" : "Reset All Filters"}
                </Button>
              </div>
            ) : (
              /* Results Grid */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {results.map((member) => (
                    <CrewCard
                      key={member.id}
                      crew={member}
                      onSendRequest={(target) => setRequestModalCrew(target)}
                    />
                  ))}
                </div>

                {/* Pagination / Load More */}
                {pagination.hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => executeSearch(pagination.page + 1, true)}
                      disabled={loadingMore}
                      className="px-8 py-5 text-xs font-semibold"
                    >
                      {loadingMore
                        ? isMalayalam
                          ? "ലോഡ് ചെയ്യുന്നു..."
                          : "Loading more crew..."
                        : isMalayalam
                        ? "കൂടുതൽ ക്രൂവിനെ കാണുക"
                        : "Load More Results"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── QUICK AVAILABILITY REQUEST MODAL ──────────────────────────────── */}
      {requestModalCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setRequestModalCrew(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {isMalayalam ? "അഭ്യർത്ഥന അയയ്ക്കുക" : "Send Availability Request"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  To: <strong>{requestModalCrew.name}</strong> ({requestModalCrew.role})
                </p>
              </div>
            </div>

            <form onSubmit={handleSendAvailabilityRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isMalayalam ? "ഇവന്റ് തീയതി *" : "Work / Event Date *"}
                </label>
                <Input
                  type="date"
                  value={requestDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="bg-muted text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isMalayalam ? "തൊഴിൽ സ്ഥലം *" : "Work Location / Venue *"}
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bolgatty Palace, Kochi"
                  value={requestLocation}
                  onChange={(e) => setRequestLocation(e.target.value)}
                  className="bg-muted text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isMalayalam ? "ഇവന്റ് തരം *" : "Type of Work *"}
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
                  <option value="Theater / Stage Show">Theater / സ്റ്റേജ് ഷോ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isMalayalam ? "കൂടുതൽ വിവരങ്ങൾ (ഓപ്ഷണൽ)" : "Specific Requirements (Optional)"}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shift from 2 PM to 10 PM. Own tools preferred."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl p-3 text-xs outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestModalCrew(null)}
                  className="flex-1 text-xs"
                >
                  {isMalayalam ? "റദ്ദാക്കുക" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={sendingRequest}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                >
                  {sendingRequest
                    ? isMalayalam
                      ? "അയയ്ക്കുന്നു..."
                      : "Sending Request..."
                    : isMalayalam
                    ? "റിക്വസ്റ്റ് അയയ്ക്കുക"
                    : "Send Availability Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizerSearchPage() {
  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </AuthGuard>
  );
}
