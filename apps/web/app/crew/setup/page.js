"use client";

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
} from "@/utils/taxonomy";
import LanguageToggle from "@/components/LanguageToggle";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
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
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Save,
  Compass,
} from "lucide-react";
import { toast } from "sonner";

export default function CrewProfileSetupPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  const phone = userPhone || currentUser?.phoneNumber || (currentUser?.uid && /^\d+$/.test(currentUser.uid) ? `+${currentUser.uid}` : null);

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

    fetch(`/api/crew/profile?phone=${encodeURIComponent(phone)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setFormData({
            name: d.name || "",
            city: d.city || "Kochi",
            role: d.role || "lighting",
            roles: Array.isArray(d.roles) && d.roles.length > 0 ? d.roles : d.role ? [d.role] : ["lighting"],
            specialisations: Array.isArray(d.specialisations) ? d.specialisations : [],
            profileImage: d.profileImage || "",
            experience: d.experience || "0-2",
            languages: Array.isArray(d.languages) && d.languages.length > 0 ? d.languages : ["ml", "en"],
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
      setError(isMl ? "ഫോട്ടോ 5 MB-ൽ താഴെയായിരിക്കണം." : "Photo must be under 5 MB.");
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
        } else {
          throw new Error("Upload failed");
        }
      } else {
        // Fallback to local Data URL for prototype testing
        const reader = new FileReader();
        reader.onload = () => {
          setFormData((prev) => ({ ...prev, profileImage: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError(isMl ? "ഫോട്ടോ അപ്‌ലോഡ് പരാജയപ്പെട്ടു." : "Photo upload failed: " + err.message);
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
    if (!confirm(isMl ? "ലൊക്കേഷൻ സമ്മതം പിൻവലിക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?" : "Are you sure you want to withdraw location consent?")) return;
    try {
      const res = await fetch("/api/crew/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, withdrawConsent: true }),
      });
      if (res.ok) {
        setSuccessMsg(isMl ? "ലൊക്കേഷൻ സമ്മതം പിൻവലിച്ചു." : "Location consent withdrawn.");
      }
    } catch (_) {}
  };

  // Submit Profile Changes
  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const res = await fetch("/api/crew/profile", {
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
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* Top Header */}
        <div className="border-b border-border bg-card/40">
          <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/crew/dashboard"
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {t("profile.title", "Edit Crew Profile")}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.subtitle", "Complete your profile to increase your visibility to event organizers.")}
                </p>
              </div>
            </div>

            <LanguageToggle />
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-950/80 border border-green-800 text-green-200 rounded-xl text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ─── 1. PROFILE PHOTO ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-foreground">
                {t("profile.photoSection", "Profile Photo")}
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center shadow-inner">
                    {formData.profileImage ? (
                      <img
                        src={formData.profileImage}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>

                  <label
                    htmlFor="profile-photo-input"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-all"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </label>
                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </div>

                <div className="text-center sm:text-left text-xs text-muted-foreground space-y-1">
                  <p>{t("profile.photoUploadHelp", "Tap camera icon to upload a photo (under 5MB).")}</p>
                  <p className="text-[11px] opacity-75">
                    {isMl
                      ? "വ്യക്തമായ മുഖചിത്രം പ്രൊഫൈൽ വിശ്വാസ്യത വർദ്ധിപ്പിക്കും."
                      : "Profiles with photos receive significantly higher response rates."}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── 2. BASIC INFORMATION ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-5">
              <h3 className="text-base font-bold text-foreground">
                {t("profile.basicSection", "Basic Information")}
              </h3>

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
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Phone (Read Only) */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {t("profile.phone", "Phone (Verified)")}
                  </label>
                  <input
                    type="text"
                    value={phone || ""}
                    disabled
                    className="w-full bg-muted/50 border border-border text-muted-foreground rounded-xl px-4 py-2.5 text-sm font-medium cursor-not-allowed"
                  />
                </div>

                {/* Base City */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {t("profile.city", "Primary City / District")} *
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-primary"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.nameEn}>
                        {isMl ? c.nameMl : c.nameEn} ({isMl ? c.nameEn : c.nameMl})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Travel Willingness */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {t("profile.travelSection", "Travel Willingness")}
                  </label>
                  <select
                    value={formData.travelWillingness}
                    onChange={(e) => setFormData({ ...formData, travelWillingness: e.target.value })}
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-primary"
                  >
                    {TRAVEL_WILLINGNESS.map((tOpt) => (
                      <option key={tOpt.id} value={tOpt.id}>
                        {isMl ? tOpt.labelMl : tOpt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ─── 3. ROLES & SPECIALISATIONS ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("profile.rolesSection", "Professional Roles & Specialisations")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isMl ? "നിങ്ങൾ പ്രവർത്തിക്കുന്ന എല്ലാ വിഭാഗങ്ങളും തിരഞ്ഞെടുക്കുക:" : "Select all categories you operate in:"}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PARENT_ROLES.map((r) => {
                  const isSelected = formData.roles.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleParentRole(r.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-black border-primary font-bold shadow-sm"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div>{isMl ? r.nameMl : r.nameEn}</div>
                      <div className={`text-[10px] ${isSelected ? "text-black/70" : "text-muted-foreground"}`}>
                        {isMl ? r.nameEn : r.nameMl}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── 4. EXPERIENCE & LANGUAGES ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Experience Range Picker */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {t("profile.experienceSection", "Years of Experience")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPERIENCE_RANGES.map((rng) => (
                      <button
                        key={rng.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, experience: rng.id })}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          formData.experience === rng.id
                            ? "bg-primary text-black border-primary font-bold shadow-sm"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isMl ? rng.labelMl : rng.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages Known Multi-select */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {t("profile.languagesSection", "Languages Spoken")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES_LIST.map((lang) => {
                      const isSelected = formData.languages.includes(lang.id);
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => toggleLanguage(lang.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-black border-primary font-bold shadow-sm"
                              : "bg-muted border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isMl ? lang.labelMl : lang.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 5. DAY RATE & PRIVACY TOGGLE ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("profile.dayRateSection", "Day Rate (INR)")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.dayRateHelp", "Expected rate per working day in Rupees.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.ratePerDay}
                    onChange={(e) => setFormData({ ...formData, ratePerDay: e.target.value })}
                    placeholder={t("profile.dayRatePlaceholder", "e.g. 3000")}
                    className="w-full bg-muted border border-border text-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold outline-none focus:border-primary"
                  />
                </div>

                {/* Rate Visibility Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <div className="text-xs">
                    <span className="font-semibold text-foreground block">
                      {formData.rateVisible
                        ? (isMl ? "വേതനം പരസ്യമാക്കുക" : "Visible to Recruiters")
                        : (isMl ? "വേതനം രഹസ്യമാക്കുക" : "Keep Rate Private")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formData.rateVisible
                        ? (isMl ? "സെർച്ചിൽ കാണിക്കും" : "Shown in search results")
                        : (isMl ? "നേരിട്ട് സംസാരിക്കാം" : "Hidden from public view")}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={formData.rateVisible}
                    onChange={(e) => setFormData({ ...formData, rateVisible: e.target.checked })}
                    className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* ─── 6. PORTFOLIO & REEL LINKS ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("profile.portfolioSection", "Portfolio & Reel Links")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isMl ? "നിങ്ങളുടെ മുൻകാല വർക്കുകൾ കാണിക്കാൻ ലിങ്കുകൾ നൽകുക:" : "Add direct links to showcase your showreels and past works:"}
                </p>
              </div>

              <div className="space-y-3">
                {/* Instagram */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {t("profile.instagram", "Instagram Profile / Reel Link")}
                  </label>
                  <input
                    type="url"
                    value={formData.portfolioLinks.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        portfolioLinks: { ...formData.portfolioLinks, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary"
                  />
                </div>

                {/* YouTube */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {t("profile.youtube", "YouTube Video / Showreel Link")}
                  </label>
                  <input
                    type="url"
                    value={formData.portfolioLinks.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        portfolioLinks: { ...formData.portfolioLinks, youtube: e.target.value },
                      })
                    }
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary"
                  />
                </div>

                {/* Google Drive */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {t("profile.drive", "Google Drive Folder / Portfolio Link")}
                  </label>
                  <input
                    type="url"
                    value={formData.portfolioLinks.drive}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        portfolioLinks: { ...formData.portfolioLinks, drive: e.target.value },
                      })
                    }
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* ─── 7. PAST CREDITS ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("profile.creditsSection", "Past Credits & Productions")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isMl ? "നിങ്ങൾ പ്രവർത്തിച്ച പ്രധാന ഇവന്റുകൾ / പ്രൊഡക്ഷനുകൾ:" : "Highlight productions, concerts, or events you worked on:"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCredit}
                  className="px-3 py-1.5 rounded-xl bg-muted border border-border hover:border-primary text-xs font-bold text-foreground flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>{isMl ? "വർക്ക് ചേർക്കുക" : "Add Credit"}</span>
                </button>
              </div>

              {formData.pastCredits.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  {isMl ? "മുൻകാല വർക്കുകൾ ചേർത്തിട്ടില്ല." : "No past credits added yet."}
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.pastCredits.map((credit, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-muted/50 border border-border flex flex-col sm:flex-row items-center gap-3"
                    >
                      <input
                        type="text"
                        value={credit.eventName}
                        onChange={(e) => updateCredit(idx, "eventName", e.target.value)}
                        placeholder={t("profile.eventName", "Production / Event Name")}
                        className="flex-1 bg-card border border-border text-foreground rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-primary w-full"
                      />
                      <input
                        type="text"
                        value={credit.role}
                        onChange={(e) => updateCredit(idx, "role", e.target.value)}
                        placeholder={t("profile.eventRole", "Your Role")}
                        className="w-full sm:w-44 bg-card border border-border text-foreground rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={credit.year}
                        onChange={(e) => updateCredit(idx, "year", e.target.value)}
                        placeholder={t("profile.eventYear", "Year")}
                        className="w-full sm:w-24 bg-card border border-border text-foreground rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeCredit(idx)}
                        className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                        aria-label="Remove credit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── 8. EQUIPMENT OWNED ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("profile.equipmentSection", "Equipment Owned")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isMl ? "നിങ്ങളുടെ കൈവശമുള്ള പ്രധാന സാങ്കേതിക ഉപകരണങ്ങൾ:" : "List equipment, gear, or toolsets you bring to gigs:"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addEquipment}
                  className="px-3 py-1.5 rounded-xl bg-muted border border-border hover:border-primary text-xs font-bold text-foreground flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>{isMl ? "ഉപകരണം ചേർക്കുക" : "Add Gear"}</span>
                </button>
              </div>

              {formData.equipmentOwned.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  {isMl ? "ഉപകരണങ്ങൾ ചേർത്തിട്ടില്ല." : "No equipment listed yet."}
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.equipmentOwned.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-muted/50 border border-border flex flex-col sm:flex-row items-center gap-3"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateEquipment(idx, "name", e.target.value)}
                        placeholder={t("profile.equipmentName", "Gear Name / Model")}
                        className="flex-1 bg-card border border-border text-foreground rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-primary w-full"
                      />
                      <select
                        value={item.category}
                        onChange={(e) => updateEquipment(idx, "category", e.target.value)}
                        className="w-full sm:w-44 bg-card border border-border text-foreground rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-primary"
                      >
                        {EQUIPMENT_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {isMl ? cat.labelMl : cat.labelEn}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeEquipment(idx)}
                        className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                        aria-label="Remove gear"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── 9. INDUSTRY ASSOCIATION MEMBERSHIP ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("profile.associationSection", "Industry Association Membership")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isMl ? "അംഗീകൃത അസോസിയേഷൻ സ്ഥിരീകരണത്തിന് ശേഷം മാത്രമേ ബാഡ്ജ് നൽകൂ." : "Association badges require official verification by the association system."}
                </p>
              </div>

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
                  className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary"
                />
              </div>

              {formData.associationMembership.verified ? (
                <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl flex items-center gap-2 text-xs text-blue-300 font-semibold">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>{t("profile.associationVerifiedBadge", "Verified Association Member")}</span>
                </div>
              ) : formData.associationMembership.name ? (
                <div className="p-3 bg-muted rounded-xl flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  <span>{t("profile.associationPendingBadge", "Verification Pending — Badges are awarded only after association confirmation.")}</span>
                </div>
              ) : null}
            </div>

            {/* ─── 10. LOCATION PRIVACY & CONSENT WITHDRAWAL ─── */}
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("profile.locationPrivacySection", "Location Privacy & Consent")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("profile.consentStatus", "Consent status: Active (Coarse location only)")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleWithdrawConsent}
                  className="px-3.5 py-1.5 rounded-xl border border-red-800/60 bg-red-950/30 text-red-300 hover:bg-red-950/60 text-xs font-bold transition-all cursor-pointer"
                >
                  {t("profile.withdrawConsentBtn", "Withdraw Location Consent")}
                </button>
              </div>
            </div>

            {/* ─── SAVE BUTTON ─── */}
            <div className="sticky bottom-4 z-30 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 px-6 rounded-2xl bg-primary text-black font-extrabold text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t("profile.saveChanges", "Save Profile Changes")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
