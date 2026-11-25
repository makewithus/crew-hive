"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
  PARENT_ROLES,
  CITIES,
  EXPERIENCE_RANGES,
  TRAVEL_WILLINGNESS,
  LANGUAGES_LIST,
  EQUIPMENT_CATEGORIES,
  calculateProfileCompleteness,
} from "@/utils/taxonomy";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import ThemedSelect from "@/components/ThemedSelect";
import { USER_ROLES } from "@/utils/constants";
import {
  User,
  Camera,
  MapPin,
  Briefcase,
  Calendar,
  Globe,
  DollarSign,
  Link as LinkIcon,
  Plus,
  Trash2,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Save,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewProfileSetupPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const phone =
    userPhone ||
    currentUser?.phoneNumber ||
    (currentUser?.uid && /^\d+$/.test(currentUser.uid) ? `+${currentUser.uid}` : null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    city: "Kochi",
    role: "lighting",
    roles: ["lighting"],
    specialisations: [],
    profileImage: "",
    experience: "3-5",
    languages: ["ml", "en"],
    ratePerDay: "",
    rateVisible: true,
    portfolioLinks: {
      instagram: "",
      youtube: "",
      drive: "",
    },
    pastCredits: [],
    equipmentOwned: [],
    travelWillingness: "kerala",
    associationMembership: {
      name: "",
      verified: false,
    },
  });

  // Fetch Existing Profile
  useEffect(() => {
    if (!phone) return;
    setLoading(true);

    apiFetch(`/api/crew/profile?phone=${encodeURIComponent(phone)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setFormData({
            name: d.name || "",
            city: d.city || "Kochi",
            role: d.role || "lighting",
            roles:
              Array.isArray(d.roles) && d.roles.length > 0
                ? d.roles
                : d.role
                ? [d.role]
                : ["lighting"],
            specialisations: Array.isArray(d.specialisations) ? d.specialisations : [],
            profileImage: d.profileImage || "",
            experience: d.experience || "0-2",
            languages:
              Array.isArray(d.languages) && d.languages.length > 0
                ? d.languages
                : ["ml", "en"],
            ratePerDay: d.ratePerDay ? String(d.ratePerDay) : "",
            rateVisible: d.rateVisible !== false,
            portfolioLinks: {
              instagram: d.portfolioLinks?.instagram || "",
              youtube: d.portfolioLinks?.youtube || "",
              drive: d.portfolioLinks?.drive || "",
            },
            pastCredits: Array.isArray(d.pastCredits) ? d.pastCredits : [],
            equipmentOwned: Array.isArray(d.equipmentOwned) ? d.equipmentOwned : [],
            travelWillingness: d.travelWillingness || "kerala",
            associationMembership: {
              name: d.associationMembership?.name || "",
              verified: d.associationMembership?.verified === true,
            },
          });
        }
      })
      .catch((err) => {
        console.error("[ProfileSetup] Error loading profile:", err);
      })
      .finally(() => setLoading(false));
  }, [phone]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      const msg = isMl ? "ഫോട്ടോ 5 MB-ൽ താഴെയായിരിക്കണം." : "Photo must be under 5 MB.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setUploadingPhoto(true);
    setError("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "crewhive_default"
      );

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (cloudName) {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: data }
        );
        const json = await res.json();
        if (json.secure_url) {
          setFormData((prev) => ({ ...prev, profileImage: json.secure_url }));
          toast.success(isMl ? "ഫോട്ടോ അപ്‌ലോഡ് ചെയ്തു!" : "Profile photo uploaded!");
        } else {
          throw new Error("Upload failed");
        }
      } else {
        // Fallback to local Data URL for prototype preview
        const reader = new FileReader();
        reader.onload = () => {
          setFormData((prev) => ({ ...prev, profileImage: reader.result }));
          toast.success(isMl ? "ഫോട്ടോ അപ്‌ലോഡ് ചെയ്തു!" : "Profile photo uploaded!");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const errMsg = isMl ? "ഫോട്ടോ അപ്‌ലോഡ് പരാജയപ്പെട്ടു." : "Photo upload failed: " + err.message;
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Toggle Parent Role
  const toggleParentRole = (rId) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(rId);
      const newRoles = exists ? prev.roles.filter((r) => r !== rId) : [...prev.roles, rId];
      return {
        ...prev,
        roles: newRoles.length > 0 ? newRoles : [rId],
        role: newRoles[0] || rId,
      };
    });
  };

  // Toggle Specialisation
  const toggleSpecialisation = (specId) => {
    setFormData((prev) => {
      const specs = Array.isArray(prev.specialisations) ? prev.specialisations : [];
      const exists = specs.includes(specId);
      const updated = exists ? specs.filter((s) => s !== specId) : [...specs, specId];
      return {
        ...prev,
        specialisations: updated,
      };
    });
  };

  // Toggle Language
  const toggleLanguage = (langId) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(langId);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((l) => l !== langId)
          : [...prev.languages, langId],
      };
    });
  };

  // Add Past Credit
  const addCredit = () => {
    setFormData((prev) => ({
      ...prev,
      pastCredits: [
        ...prev.pastCredits,
        { eventName: "", role: "", year: new Date().getFullYear().toString() },
      ],
    }));
  };

  const removeCredit = (index) => {
    setFormData((prev) => ({
      ...prev,
      pastCredits: prev.pastCredits.filter((_, idx) => idx !== index),
    }));
  };

  const updateCredit = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.pastCredits];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, pastCredits: updated };
    });
  };

  // Add Equipment Item
  const addEquipment = () => {
    setFormData((prev) => ({
      ...prev,
      equipmentOwned: [
        ...prev.equipmentOwned,
        { name: "", category: "lighting", model: "" },
      ],
    }));
  };

  const removeEquipment = (index) => {
    setFormData((prev) => ({
      ...prev,
      equipmentOwned: prev.equipmentOwned.filter((_, idx) => idx !== index),
    }));
  };

  const updateEquipment = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.equipmentOwned];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, equipmentOwned: updated };
    });
  };

  // Withdraw Location Consent
  const handleWithdrawConsent = async () => {
    if (
      !confirm(
        isMl
          ? "ലൊക്കേഷൻ സമ്മതം പിൻവലിക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?"
          : "Are you sure you want to withdraw location consent?"
      )
    )
      return;
    try {
      const res = await apiFetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, withdrawConsent: true }),
      });
      if (res.ok) {
        setSuccessMsg(isMl ? "ലൊക്കേഷൻ സമ്മതം പിൻവലിച്ചു." : "Location consent withdrawn.");
        toast.info(isMl ? "ലൊക്കേഷൻ സമ്മതം പിൻവലിച്ചു." : "Location consent withdrawn.");
      }
    } catch (_) {}
  };

  // Submit Profile Changes
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.name.trim()) {
      const msg = isMl ? "പേര് നിർബന്ധമാണ്." : "Full name is required.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);

    try {
      const res = await apiFetch("/api/crew/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          updates: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      const successText = t("profile.saveSuccess", "Profile updated successfully!");
      setSuccessMsg(successText);
      toast.success(isMl ? "പ്രൊഫൈൽ വിജയകരമായി അപ്‌ഡേറ്റ് ചെയ്തു!" : successText);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[ProfileSetup] Save error:", err);
      const errMsg = err.message || "Failed to save profile changes.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Profile Completeness calculation
  const completeness = calculateProfileCompleteness(formData);

  // Resolve role labels
  const roleId = formData.role || formData.roles[0];
  const parentRoleObj = PARENT_ROLES.find((r) => r.id === roleId);
  const displayRole = parentRoleObj
    ? isMl
      ? parentRoleObj.nameMl
      : parentRoleObj.nameEn
    : formData.role || "Crew Member";

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("common.loading", "Loading profile...")}
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-16 font-sans">
        {/* ─── TOP HEADER / GREETING BAR (MATCHES DASHBOARD) ─── */}
        <div className="border-b border-border bg-card/40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href="/crew/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isMl ? "ഡാഷ്‌ബോർഡ്" : "Dashboard"}</span>
                </Link>
                <span className="text-muted-foreground/60">/</span>
                <span className="text-xs font-semibold text-primary">
                  {t("profile.title", "Edit Crew Profile")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t("profile.title", "Edit Crew Profile")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isMl
                  ? "നിങ്ങളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ പുതുക്കി റിക്രൂട്ടർമാർക്ക് കൂടുതൽ കണ്ടെത്താൻ സഹായിക്കുക."
                  : "Update your technical credentials and commercial terms."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/crew/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isMl ? "ഡാഷ്‌ബോർഡിലേക്ക്" : "Back to Dashboard"}</span>
              </Link>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-xs sm:text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.4)] cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t("profile.saveChanges", "Save Profile Changes")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT 2-COLUMN LAYOUT ─── */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Notifications */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-2xl text-sm flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-950/80 border border-green-800 text-green-200 rounded-2xl text-sm flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ─── LEFT COLUMN: STICKY SIDEBAR (DESKTOP) ─── */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              {/* Profile Overview Card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                {/* Centered Profile Avatar & Image Selector */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3.5">
                    <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center shadow-md">
                      {formData.profileImage ? (
                        <img
                          src={formData.profileImage}
                          alt={formData.name || "Technician"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <label
                      htmlFor="avatar-upload-sidebar"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-all border-2 border-card active:scale-95"
                      title={isMl ? "ഫോട്ടോ മാറ്റുക" : "Upload photo"}
                    >
                      {uploadingPhoto ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                    <input
                      id="avatar-upload-sidebar"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </div>

                  <h2 className="font-extrabold text-lg text-foreground truncate max-w-full">
                    {formData.name || (isMl ? "ടെക്നീഷ്യൻ" : "Technician")}
                  </h2>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>{displayRole}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span>{formData.city || "Kerala"}</span>
                  </p>
                </div>

                {/* Profile Completeness Meter */}
                <div className="pt-4 border-t border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {t("dashboard.profileCompleteness", "Profile Completeness")}
                    </span>
                    <span className="text-sm font-black text-primary">
                      {completeness.percentage}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${completeness.percentage}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed text-center sm:text-left">
                    {completeness.nextAction
                      ? isMl
                        ? completeness.nextAction.textMl
                        : completeness.nextAction.textEn
                      : isMl
                      ? "നിങ്ങളുടെ പ്രൊഫൈൽ 100% പൂർണ്ണമാണ്!"
                      : "Your profile is 100% complete!"}
                  </p>
                </div>
              </div>
            </aside>

            {/* ─── RIGHT COLUMN: PROFILE FORM SECTIONS ─── */}
            <main className="lg:col-span-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ─── 1. BASIC INFORMATION ─── */}
                <div
                  id="sec-basic"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.basicSection", "Basic Information")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങളും പ്രവർത്തന നഗരവും:"
                            : "Your primary contact and operational location:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.name", "Full Name")} *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                        placeholder="e.g. Rahul Menon"
                        required
                      />
                    </div>

                    {/* Phone (Verified - Read Only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          {t("profile.phone", "Phone (Verified)")}
                        </label>
                        <span className="text-[10px] text-green-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>OTP Verified</span>
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={phone || ""}
                          disabled
                          className="w-full bg-muted/50 border border-border text-muted-foreground rounded-xl px-4 py-2.5 text-sm font-medium cursor-not-allowed pr-10"
                        />
                        <CheckCircle2 className="w-4 h-4 text-green-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Primary City / District */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.city", "Primary City / District")} *
                      </label>
                      <ThemedSelect
                        value={formData.city}
                        onChange={(val) => setFormData({ ...formData, city: val })}
                        options={CITIES.map((c) => ({
                          value: c.nameEn,
                          label: isMl ? c.nameMl : c.nameEn,
                        }))}
                        placeholder={isMl ? "നഗരം തിരഞ്ഞെടുക്കുക" : "Select primary city"}
                        searchable
                        searchPlaceholder={isMl ? "നഗരം തിരയുക..." : "Search city..."}
                      />
                    </div>

                    {/* Travel Willingness */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.travelSection", "Travel Willingness")}
                      </label>
                      <ThemedSelect
                        value={formData.travelWillingness}
                        onChange={(val) =>
                          setFormData({ ...formData, travelWillingness: val })
                        }
                        options={TRAVEL_WILLINGNESS.map((tOpt) => ({
                          value: tOpt.id,
                          label: isMl ? tOpt.labelMl : tOpt.labelEn,
                        }))}
                        placeholder={isMl ? "യാത്രാ പരിധി" : "Select travel willingness"}
                      />
                    </div>
                  </div>
                </div>

                {/* ─── 2. ROLES & TECHNICAL SPECIALISATIONS ─── */}
                <div
                  id="sec-roles"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.rolesSection", "Roles & Specialisations")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "നിങ്ങൾ പ്രവർത്തിക്കുന്ന എല്ലാ സാങ്കേതിക വിഭാഗങ്ങളും തിരഞ്ഞെടുക്കുക:"
                            : "Select all categories and technical roles you operate in:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 10 Parent Roles Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PARENT_ROLES.map((r) => {
                      const isSelected = formData.roles.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleParentRole(r.id)}
                          className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-primary text-black border-primary font-bold shadow-xs"
                              : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-zinc-600"
                          }`}
                        >
                          <span className="truncate">{isMl ? r.nameMl : r.nameEn}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-black ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Specialisations for Selected Roles */}
                  {formData.roles.some(
                    (rId) => PARENT_ROLES.find((pr) => pr.id === rId)?.specialisations?.length
                  ) && (
                    <div className="pt-4 border-t border-border/70 space-y-4">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {isMl
                          ? "പ്രത്യേക വൈദഗ്ധ്യങ്ങൾ (Specialisations):"
                          : "Specific Specialisations:"}
                      </div>
                      <div className="space-y-3">
                        {formData.roles.map((rId) => {
                          const parentRole = PARENT_ROLES.find((pr) => pr.id === rId);
                          if (!parentRole || !parentRole.specialisations?.length) return null;
                          return (
                            <div
                              key={rId}
                              className="p-3.5 bg-muted/60 border border-border/80 rounded-xl space-y-2"
                            >
                              <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <span>{isMl ? parentRole.nameMl : parentRole.nameEn}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {parentRole.specialisations.map((spec) => {
                                  const isChecked = (formData.specialisations || []).includes(
                                    spec.id
                                  );
                                  return (
                                    <button
                                      key={spec.id}
                                      type="button"
                                      onClick={() => toggleSpecialisation(spec.id)}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                        isChecked
                                          ? "bg-primary text-black border-primary font-bold shadow-xs"
                                          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-zinc-500"
                                      }`}
                                    >
                                      {isMl ? spec.nameMl : spec.nameEn}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── 3. EXPERIENCE, LANGUAGES & DAY RATE ─── */}
                <div
                  id="sec-experience"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.experienceSection", "Experience & Day Rate")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "പരിചയസമ്പത്ത്, ഭാഷകൾ, പ്രതിദിന വേതനം എന്നിവ നൽകുക:"
                            : "Set your experience level, languages spoken, and daily expected rate:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Years of Experience */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">
                        {t("profile.experienceSection", "Years of Experience")}
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {EXPERIENCE_RANGES.map((rng) => (
                          <button
                            key={rng.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, experience: rng.id })}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                              formData.experience === rng.id
                                ? "bg-primary text-black border-primary font-bold shadow-xs"
                                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-zinc-600"
                            }`}
                          >
                            {isMl ? rng.labelMl : rng.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Languages Spoken */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">
                        {t("profile.languagesSection", "Languages Spoken")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES_LIST.map((lang) => {
                          const isSelected = formData.languages.includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => toggleLanguage(lang.id)}
                              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-black border-primary font-bold shadow-xs"
                                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-zinc-600"
                              }`}
                            >
                              {isMl ? lang.labelMl : lang.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Day Rate & Visibility */}
                  <div className="pt-4 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.dayRateSection", "Day Rate (INR)")}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={formData.ratePerDay}
                          onChange={(e) =>
                            setFormData({ ...formData, ratePerDay: e.target.value })
                          }
                          placeholder={t("profile.dayRatePlaceholder", "e.g. 3000")}
                          className="w-full bg-muted border border-border text-foreground rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    {/* Rate Visibility Card */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {isMl ? "വേതന പരസ്യ നില" : "Rate Visibility"}
                      </label>
                      <label className="flex items-center justify-between h-[42px] px-4 rounded-xl bg-muted border border-border cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {formData.rateVisible ? (
                              <Eye className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span>
                              {formData.rateVisible
                                ? isMl
                                  ? "വേതനം പരസ്യമാക്കുക"
                                  : "Visible in Search"
                                : isMl
                                ? "വേതനം രഹസ്യമാക്കുക"
                                : "Keep Rate Private"}
                            </span>
                          </span>
                        </div>

                        <input
                          type="checkbox"
                          checked={formData.rateVisible}
                          onChange={(e) =>
                            setFormData({ ...formData, rateVisible: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* ─── 4. PORTFOLIO & SHOWREEL LINKS ─── */}
                <div
                  id="sec-portfolio"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.portfolioSection", "Portfolio & Reel Links")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "നിങ്ങളുടെ മുൻകാല വർക്കുകൾ കാണിക്കാൻ ലിങ്കുകൾ നൽകുക:"
                            : "Add direct links to showcase your showreels and past works:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Instagram */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.instagram", "Instagram Profile / Reel Link")}
                      </label>
                      <input
                        type="url"
                        value={formData.portfolioLinks.instagram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portfolioLinks: {
                              ...formData.portfolioLinks,
                              instagram: e.target.value,
                            },
                          })
                        }
                        placeholder="https://instagram.com/yourhandle"
                        className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* YouTube */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.youtube", "YouTube Video / Showreel Link")}
                      </label>
                      <input
                        type="url"
                        value={formData.portfolioLinks.youtube}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portfolioLinks: {
                              ...formData.portfolioLinks,
                              youtube: e.target.value,
                            },
                          })
                        }
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* Google Drive */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.drive", "Google Drive Folder / Portfolio Link")}
                      </label>
                      <input
                        type="url"
                        value={formData.portfolioLinks.drive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portfolioLinks: {
                              ...formData.portfolioLinks,
                              drive: e.target.value,
                            },
                          })
                        }
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── 5. PAST CREDITS & PRODUCTIONS ─── */}
                <div
                  id="sec-credits"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.creditsSection", "Past Credits & Productions")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "നിങ്ങൾ പ്രവർത്തിച്ച പ്രധാന ഇവന്റുകൾ / പ്രൊഡക്ഷനുകൾ:"
                            : "Highlight productions, concerts, or events you worked on:"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addCredit}
                      className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/25 hover:bg-primary/20 text-xs font-bold text-primary flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isMl ? "വർക്ക് ചേർക്കുക" : "Add Credit"}</span>
                    </button>
                  </div>

                  {formData.pastCredits.length === 0 ? (
                    <div className="py-6 px-4 bg-muted/40 border border-dashed border-border rounded-xl text-center space-y-1.5">
                      <Calendar className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground font-medium">
                        {isMl
                          ? "മുൻകാല വർക്കുകൾ ചേർത്തിട്ടില്ല."
                          : "No past credits added yet."}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {isMl
                          ? "മുൻകാല പ്രൊഡക്ഷനുകൾ ചേർക്കുന്നത് കൂടുതൽ റിക്രൂട്ടർമാരെ ആകർഷിക്കും."
                          : "Adding past events or cinema shoots builds confidence with recruiters."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.pastCredits.map((credit, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-muted/60 border border-border flex flex-col sm:flex-row items-center gap-3"
                        >
                          <input
                            type="text"
                            value={credit.eventName}
                            onChange={(e) =>
                              updateCredit(idx, "eventName", e.target.value)
                            }
                            placeholder={t("profile.eventName", "Production / Event Name")}
                            className="flex-1 bg-card border border-border text-foreground rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all focus:border-primary w-full"
                          />
                          <input
                            type="text"
                            value={credit.role}
                            onChange={(e) => updateCredit(idx, "role", e.target.value)}
                            placeholder={t("profile.eventRole", "Your Role")}
                            className="w-full sm:w-44 bg-card border border-border text-foreground rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all focus:border-primary"
                          />
                          <input
                            type="text"
                            value={credit.year}
                            onChange={(e) => updateCredit(idx, "year", e.target.value)}
                            placeholder={t("profile.eventYear", "Year")}
                            className="w-full sm:w-24 bg-card border border-border text-foreground rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeCredit(idx)}
                            className="p-2 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                            aria-label="Remove credit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── 6. EQUIPMENT OWNED ─── */}
                <div
                  id="sec-equipment"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.equipmentSection", "Equipment Owned")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "നിങ്ങളുടെ കൈവശമുള്ള പ്രധാന സാങ്കേതിക ഉപകരണങ്ങൾ:"
                            : "List equipment, gear, or toolsets you bring to gigs:"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addEquipment}
                      className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/25 hover:bg-primary/20 text-xs font-bold text-primary flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isMl ? "ഉപകരണം ചേർക്കുക" : "Add Gear"}</span>
                    </button>
                  </div>

                  {formData.equipmentOwned.length === 0 ? (
                    <div className="py-6 px-4 bg-muted/40 border border-dashed border-border rounded-xl text-center space-y-1.5">
                      <Sliders className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground font-medium">
                        {isMl ? "ഉപകരണങ്ങൾ ചേർത്തിട്ടില്ല." : "No equipment listed yet."}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {isMl
                          ? "ഉപകരണങ്ങൾ ലിസ്റ്റ് ചെയ്യുന്നത് ഉപകരണ സഹിതമുള്ള വർക്കുകൾ ലഭിക്കാൻ സഹായിക്കും."
                          : "Listing your gear or consoles gives you priority for equipment-specific gigs."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.equipmentOwned.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-muted/60 border border-border flex flex-col sm:flex-row items-center gap-3"
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateEquipment(idx, "name", e.target.value)
                            }
                            placeholder={t("profile.equipmentName", "Gear Name / Model")}
                            className="flex-1 bg-card border border-border text-foreground rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all focus:border-primary w-full"
                          />
                          <div className="w-full sm:w-48">
                            <ThemedSelect
                              value={item.category}
                              onChange={(val) =>
                                updateEquipment(idx, "category", val)
                              }
                              options={EQUIPMENT_CATEGORIES.map((cat) => ({
                                value: cat.id,
                                label: isMl ? cat.labelMl : cat.labelEn,
                              }))}
                              placeholder="Category"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEquipment(idx)}
                            className="p-2 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                            aria-label="Remove gear"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── 7. INDUSTRY GUILD & LOCATION PRIVACY ─── */}
                <div
                  id="sec-associations"
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 scroll-mt-24"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {t("profile.associationSection", "Industry Association & Privacy")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isMl
                            ? "അസോസിയേഷൻ മെമ്പർഷിപ്പും ലൊക്കേഷൻ ക്രമീകരണങ്ങളും:"
                            : "Guild memberships and location privacy settings:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Association Guild */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        {t("profile.associationName", "Association (e.g. FEFKA, K-ECA, etc.)")}
                      </label>
                      <input
                        type="text"
                        value={formData.associationMembership.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            associationMembership: {
                              ...formData.associationMembership,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. FEFKA / K-ECA"
                        className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {formData.associationMembership.verified ? (
                      <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl flex items-center gap-2 text-xs text-blue-300 font-semibold">
                        <Award className="w-4 h-4 text-blue-400" />
                        <span>
                          {t("profile.associationVerifiedBadge", "Verified Association Member")}
                        </span>
                      </div>
                    ) : formData.associationMembership.name ? (
                      <div className="p-3 bg-muted/70 border border-border/60 rounded-xl flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {t(
                            "profile.associationPendingBadge",
                            "Verification Pending — Badges are awarded after association confirmation."
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Location Privacy & Consent Withdrawal */}
                  <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {t("profile.locationPrivacySection", "Location Privacy & Consent")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(
                          "profile.consentStatus",
                          "Consent status: Active (Coarse district-level location only — no continuous GPS tracking)"
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleWithdrawConsent}
                      className="px-3.5 py-1.5 rounded-xl border border-red-800/60 bg-red-950/30 text-red-300 hover:bg-red-950/60 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      {t("profile.withdrawConsentBtn", "Withdraw Location Consent")}
                    </button>
                  </div>
                </div>
              </form>
            </main>
          </div>
        </div>

        {/* ─── DOCKED BOTTOM ACTION BAR (VISIBLE ONLY ON MOBILE & TABLETS) ─── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl py-3 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Link
              href="/crew/dashboard"
              className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isMl ? "ഡാഷ്‌ബോർഡ്" : "Back"}</span>
            </Link>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-extrabold text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t("profile.saveChanges", "Save Profile Changes")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
