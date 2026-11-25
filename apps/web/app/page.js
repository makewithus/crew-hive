"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import Footer from "@/components/Footer";
import AssociationForm from "@/components/AssociationForm";
import WhatsAppButton from "@/components/WhatsAppButton";
import SignUpModal from "@/components/SignUpModal";
import { useLanguage } from "@/context/LanguageContext";
import {
  ConsoleFaderIcon,
  ProductionClapperIcon,
  StageLightIcon,
  RiggingTrussIcon,
  WhatsAppBrandIcon,
} from "@/components/icons/AvIcons";
import {
  LogIn,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  SunMedium,
  Volume2,
  Layers,
  Flame,
  Camera,
  Clapperboard,
  Palette,
  Image as ImageIcon,
  Sliders,
  SlidersHorizontal,
  Tv2,
  Check,
  Info,
  Building2,
  Quote,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Briefcase,
} from "lucide-react";

export default function Home() {
  const { currentUser, userRole, isSuperAdmin, userApproved, loading } =
    useAuth();
  const router = useRouter();
  const { t, getSection, locale, isMalayalam } = useLanguage();

  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpRole, setSignUpRole] = useState(null); // 'crew' | 'organizer' | null
  const [activeWorkflowTab, setActiveWorkflowTab] = useState("crew"); // 'crew' | 'recruiter'

  // Read stored role to avoid home page flash for authenticated recruiters/crew
  const [cachedRole] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("crewhive_user_role") || null;
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  // Preserve instant redirect for authenticated users without landing page flash
  useEffect(() => {
    const activeRole = userRole || cachedRole;
    if (isSuperAdmin) {
      router.replace("/super-admin/dashboard");
      return;
    }
    if (activeRole === "organizer") {
      router.replace("/organizer/dashboard");
      return;
    }
    if (activeRole === "crew") {
      router.replace("/crew/dashboard");
      return;
    }
  }, [loading, currentUser, userRole, cachedRole, isSuperAdmin, userApproved, router]);

  // If already authenticated or resolving an organizer/crew session, show seamless dark loader
  if (cachedRole === "organizer" || userRole === "organizer" || cachedRole === "crew" || userRole === "crew" || isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleOpenSignUp = (role = null) => {
    if (role === "crew") {
      router.push("/crew/onboarding");
      return;
    }
    setSignUpRole(role);
    setSignUpOpen(true);
  };

  // Structured content from translation dictionaries
  const crewBenefits = getSection("home.crewBenefits.items") || [];
  const recruiterBenefits = getSection("home.recruiterBenefits.items") || [];
  const crewSteps = getSection("home.howItWorks.crewSteps") || [];
  const recruiterSteps = getSection("home.howItWorks.recruiterSteps") || [];
  const roleCategories = getSection("home.rolesShowcase.categories") || [];
  const priorityIndustries = getSection("home.hero.industries") || [];

  // Professional role category icons mapping
  const categoryIcons = {
    lighting: <StageLightIcon className="w-6 h-6 text-amber-400" />,
    sound: <Volume2 className="w-6 h-6 text-primary" />,
    rigging: <RiggingTrussIcon className="w-6 h-6 text-sky-400" />,
    sfx: <Flame className="w-6 h-6 text-orange-400" />,
    camera: <Camera className="w-6 h-6 text-emerald-400" />,
    direction: <Clapperboard className="w-6 h-6 text-purple-400" />,
    art_set: <Palette className="w-6 h-6 text-pink-400" />,
    photo_video: <ImageIcon className="w-6 h-6 text-blue-400" />,
    post: <Sliders className="w-6 h-6 text-indigo-400" />,
    led_video: <Tv2 className="w-6 h-6 text-amber-300" />,
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-primary">
      {/* ── Background Glow Elements ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 max-w-full">
        <div className="absolute -top-20 sm:-top-40 left-1/2 -translate-x-1/2 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] bg-primary/7 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 sm:-right-60 w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 sm:-left-60 w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      {/* ── Public Navigation ── */}
      <PublicNavbar onOpenSignUp={handleOpenSignUp} />

      <main className="flex-1 relative z-10 w-full max-w-full overflow-x-hidden">
        {/* ── 1. Hero Section ── */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 md:pt-24 pb-12 sm:pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-8 shadow-xs max-w-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-primary text-[11px] sm:text-xs font-semibold tracking-wide uppercase truncate">
              {t("home.hero.badge", "Kerala's Audio-Visual Industry Network")}
            </span>
          </div>

          {/* Positioning Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-4 sm:mb-6 max-w-5xl mx-auto text-foreground break-words hyphens-auto">
            {locale === "en" ? (
              <>
                Kerala&apos;s AV and events crew,{" "}
                <span className="text-primary relative inline-block">
                  in one place.
                  <span className="absolute -bottom-1 sm:-bottom-1.5 left-0 right-0 h-0.75 sm:h-1 bg-primary/40 rounded-full" />
                </span>
              </>
            ) : (
              <span className="text-foreground">
                {t("home.hero.headline", "കേരളത്തിലെ AV, ഇവന്റ് ക്രൂ ഒരു കുടക്കീഴിൽ.")}
              </span>
            )}
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-1">
            {t(
              "home.hero.subheadline",
              "CrewHive connects skilled audio-visual and event technicians with production houses, event managers, and agencies across Kerala."
            )}
          </p>

          {/* Priority Industries Pills */}
          <div className="mb-8 sm:mb-10 max-w-3xl mx-auto">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              {t("home.hero.priorityIndustriesTitle", "Focused on Kerala's creative & live event industries:")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-1">
              {priorityIndustries.map((ind, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 text-zinc-300 text-[11px] sm:text-xs font-medium hover:border-amber-500/40 hover:text-amber-300 transition-colors shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/90 shadow-[0_0_6px_rgba(245,166,35,0.7)] shrink-0" />
                  <span>{ind}</span>
                </span>
              ))}
            </div>
          </div>

          {/* CTAs: Crew Web Signup, Recruiter Web Signup, WhatsApp Signup */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3.5 max-w-md sm:max-w-4xl mx-auto mb-6 sm:mb-8 px-2 sm:px-0">
            <button
              onClick={() => handleOpenSignUp("crew")}
              type="button"
              className="w-full sm:w-auto min-h-[48px] sm:h-14 inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#F5A623] via-[#E89818] to-[#D48208] text-zinc-950 font-bold px-5 sm:px-6 py-3.5 rounded-xl border border-[#FFC266]/40 hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.5)] text-sm sm:text-base cursor-pointer group shrink-0 text-center"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span className="tracking-tight text-center leading-tight">{t("home.hero.primaryCta", "Create free profile")}</span>
              <ChevronRight className="w-4 h-4 text-zinc-950/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <button
              onClick={() => handleOpenSignUp("organizer")}
              type="button"
              className="w-full sm:w-auto min-h-[48px] sm:h-14 inline-flex items-center justify-center gap-2 bg-gradient-to-b from-zinc-800/90 to-zinc-900/95 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-zinc-100 hover:text-white font-semibold px-5 sm:px-6 py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.5)] text-sm sm:text-base cursor-pointer group shrink-0 text-center"
            >
              <Briefcase className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="tracking-tight text-center leading-tight">{t("home.hero.secondaryCta", "I'm hiring crew")}</span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <WhatsAppButton
              variant="secondary"
              text={t("home.hero.whatsappCta", "Sign up via WhatsApp")}
              className="w-full sm:w-auto min-h-[48px] sm:h-14 px-5 sm:px-6 shrink-0"
            />
          </div>

          {/* Sign In Prompt */}
          <div className="text-xs text-muted-foreground">
            <span>{t("home.hero.signInPrompt", "Already registered?")} </span>
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1 min-h-[36px] py-1"
            >
              <span>{t("home.hero.signInLink", "Sign in with phone")}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>

        {/* ── 2. Skilled Technicians Focus Banner ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{t("home.audienceNotice.badge", "Launch Priority")}</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                {t("home.audienceNotice.title", "Built for Skilled Technicians")}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t(
                  "home.audienceNotice.description",
                  "Technicians are the core launch focus of CrewHive. From live sound and concert lighting to cinema camera crews and post-production specialists, our verified platform helps you showcase your craft and get booked."
                )}
              </p>
            </div>
            <button
              onClick={() => handleOpenSignUp("crew")}
              type="button"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-xs sm:text-sm px-5 py-3 rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.4)] min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{t("common.nav.createProfile", "Create free profile")}</span>
            </button>
          </div>
        </section>

        {/* ── 3. Crew Benefits Section ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-3">
              <ConsoleFaderIcon className="w-3.5 h-3.5" />
              <span>{t("home.crewBenefits.badge", "For Working Crew")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("home.crewBenefits.title", "Why Skilled Technicians Choose CrewHive")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t(
                "home.crewBenefits.subtitle",
                "Everything you need to showcase your skills, control your schedule, and connect with genuine recruiters."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {crewBenefits.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary/40 hover:bg-card/90 transition-all duration-200 flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm mb-4">
                  0{i + 1}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/30 text-center max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {t(
                  "home.crewBenefits.disclaimer",
                  "CrewHive is a direct discovery platform. We do not promise employment, booking allocation, or fixed income."
                )}
              </span>
            </p>
          </div>
        </section>

        {/* ── 4. Recruiter Benefits Section ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 border-t border-border/60">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/80 text-zinc-300 text-xs font-semibold mb-3">
              <ProductionClapperIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("home.recruiterBenefits.badge", "For Production Houses & Organizers")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("home.recruiterBenefits.title", "Why Recruiters Hire on CrewHive")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t(
                "home.recruiterBenefits.subtitle",
                "Eliminate endless phone calls and last-minute panic. Discover verified AV talent ready to work across Kerala."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {recruiterBenefits.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-purple-500/40 hover:bg-card/90 transition-all duration-200 flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-sm mb-4">
                  0{i + 1}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/30 text-center max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                {t(
                  "home.recruiterBenefits.disclaimer",
                  "CrewHive provides direct talent discovery. Bookings, commercial agreements, and payouts are handled directly between recruiters and crew."
                )}
              </span>
            </p>
          </div>
        </section>

        {/* ── 5. How It Works Section ── */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 scroll-mt-24 border-t border-border/60"
        >
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("home.howItWorks.badge", "Simple & Transparent")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("home.howItWorks.title", "How CrewHive Works")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
              {t(
                "home.howItWorks.subtitle",
                "Two clear pathways built specifically for Kerala's audio-visual industry."
              )}
            </p>

            {/* Workflow Tabs */}
            <div className="grid grid-cols-2 w-full max-w-sm sm:max-w-md mx-auto p-1 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveWorkflowTab("crew")}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
                  activeWorkflowTab === "crew"
                    ? "bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <ConsoleFaderIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">{t("home.howItWorks.crewTab", "For Crew Members")}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkflowTab("recruiter")}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
                  activeWorkflowTab === "recruiter"
                    ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <ProductionClapperIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                <span className="truncate">{t("home.howItWorks.recruiterTab", "For Recruiters")}</span>
              </button>
            </div>
          </div>

          {/* Workflow Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {(activeWorkflowTab === "crew" ? crewSteps : recruiterSteps).map(
              (step, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-2xl border p-6 backdrop-blur-xs transition-all ${
                    activeWorkflowTab === "crew"
                      ? "border-primary/25 bg-card/70 hover:border-primary/50"
                      : "border-purple-500/25 bg-card/70 hover:border-purple-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-2xl font-black ${
                        activeWorkflowTab === "crew"
                          ? "text-primary"
                          : "text-purple-400"
                      }`}
                    >
                      {step.number}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        activeWorkflowTab === "crew"
                          ? "bg-primary/10 text-primary"
                          : "bg-purple-500/10 text-purple-400"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        {/* ── 6. Professional Role Categories Showcase ── */}
        <section
          id="categories"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 scroll-mt-24 border-t border-border/60"
        >
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <Sliders className="w-3.5 h-3.5" />
              <span>{t("home.rolesShowcase.badge", "Technical Crafts")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("home.rolesShowcase.title", "Professional Role Categories")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t(
                "home.rolesShowcase.subtitle",
                "Covering the complete technical ecosystem of live events, broadcast, cinema, and media production in Kerala."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {roleCategories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-4 shadow-xs">
                    {categoryIcons[cat.id] || (
                      <Layers className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                    {cat.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                    {cat.description}
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/60">
                    {cat.skills?.map((sk, sidx) => (
                      <span
                        key={sidx}
                        className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Profile Disclaimer & Preview */}
          <div className="mt-10 sm:mt-14 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Info className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    {t("home.sampleProfile.badge", "Sample profile")}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">
                    {t("home.sampleProfile.badgeNote", "Demonstration Preview")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-foreground">
                  {t("home.sampleProfile.viewTitle", "Interactive Profile Preview")}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "home.sampleProfile.viewDescription",
                    "How skilled technicians appear to verified recruiters on CrewHive."
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenSignUp("crew")}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-xs sm:text-sm px-5 sm:px-6 py-3 rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.4)] min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{t("common.nav.createProfile", "Create free profile")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-950/70" />
            </button>
          </div>
        </section>

        {/* ── 7. Association Partnership Section ── */}
        <section
          id="for-associations"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 scroll-mt-24 border-t border-border/60"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left side: Explanatory Content */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>{t("associations.section.badge", "Institutional Collaboration")}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {t(
                  "associations.section.title",
                  "Partnering with Industry Associations"
                )}
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {t(
                  "associations.section.description",
                  "CrewHive collaborates with recognized professional guilds, trade unions, and technical associations in Kerala's film, audio-visual, and live event sectors. We provide dedicated onboarding tracks, member roster digitization, and credential verification to help your members get hired directly without intermediaries."
                )}
              </p>

              <div className="space-y-3 sm:space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("associations.section.keyBenefitsTitle", "How CrewHive Collaborates with Associations:")}
                </h4>

                {(getSection("associations.section.benefits") || []).map((b, bidx) => (
                  <div key={bidx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                    <div>
                      <h5 className="text-sm font-bold text-foreground">{b.title}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Functional Association Partnership Inquiry Form */}
            <div className="lg:col-span-7 w-full min-w-0">
              <AssociationForm onOpenSignUp={handleOpenSignUp} />
            </div>
          </div>
        </section>

        {/* ── 8. Founder Note Section ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 border-t border-border/60">
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card/80 p-5 sm:p-8 md:p-12 relative overflow-hidden shadow-xl">
            <Quote className="w-12 h-12 sm:w-16 sm:h-16 text-primary/10 absolute top-4 sm:top-6 right-4 sm:right-6 pointer-events-none hidden sm:block" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 sm:mb-6">
                <Clock className="w-3.5 h-3.5" />
                <span>{t("home.founderNote.badge", "Platform Vision")}</span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                {t("home.founderNote.title", "A Note from the Founder")}
              </h2>

              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/50 border border-border/60 text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4 sm:mb-6 inline-block">
                {t("home.founderNote.slotNotice", "Official Founder Statement Slot")}
              </div>

              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed italic mb-6 sm:mb-8">
                &ldquo;{t("home.founderNote.message", "CrewHive was conceived to bring structure, transparency, and dignity to the dedicated technicians who power Kerala's vibrant audio-visual, film, and live events sector. Ahead of our January 1, 2027 official launch, we are working closely with industry associations, technical veterans, and production houses to ensure this platform serves the genuine interests of our working crew. The full founder address and roadmap will be shared here in the upcoming milestones.")}&rdquo;
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-border/60 text-xs">
                <div>
                  <p className="font-bold text-foreground">
                    {t("home.founderNote.signoff", "CrewHive Founders & Steering Committee")}
                  </p>
                  <p className="text-muted-foreground text-[11px] sm:text-xs">Kerala, India</p>
                </div>
                <div className="inline-flex items-center gap-2 text-primary font-semibold text-[11px] sm:text-xs">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("home.founderNote.targetDate", "Target Launch: January 1, 2027")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Public Website Footer ── */}
      <Footer onOpenSignUp={handleOpenSignUp} />

      {/* ── Web Signup Modal ── */}
      <SignUpModal
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        defaultRole={signUpRole}
      />
    </div>
  );
}
