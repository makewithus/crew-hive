"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createCrewProfile, getUser, getCrewProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthGuard from "@/components/AuthGuard";
import { USER_ROLES } from "@/utils/constants";
import { AlertTriangle, Camera, User } from "lucide-react";

const CREW_ROLES = [
  "Sound Engineer",
  "Lighting Operator",
  "LED Wall Tech",
  "Stage Manager",
  "Rigger",
  "Cinematographer",
  "Photographer",
  "Assistant Director",
  "Editor",
  "Drone Pilot",
];
const EXPERIENCE_LEVELS = ["0–2 years", "3–5 years", "5–10 years", "10+ years"];
const CITIES = [
  "Kochi",
  "Trivandrum",
  "Kozhikode",
  "Thrissur",
  "Kannur",
  "Kottayam",
  "Malappuram",
  "Palakkad",
  "Alappuzha",
];

export default function CrewSetupPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    experience: "",
    city: "",
    travelRange: "",
    ratePerDay: "",
    bio: "",
    portfolioLink: "",
    email: "",
    profileImage: "",
  });
  const [imageUploading, setImageUploading] = useState(false);

  // Autofill from existing crew profile first, fall back to users doc
  useEffect(() => {
    if (!userPhone) return;
    setLoading(true);
    Promise.all([getCrewProfile(userPhone), getUser(userPhone)]).then(
      ([crewResult, userResult]) => {
        // crew collection has the richest data if profile already exists
        const c = crewResult.success ? crewResult.data : {};
        const u = userResult.success ? userResult.data : {};
        setFormData((prev) => ({
          ...prev,
          name: c.name || u.name || prev.name,
          role: c.role || u.crewRole || prev.role,
          experience: c.experience || u.experience || prev.experience,
          city: c.city || u.city || prev.city,
          travelRange: c.travelRange ? String(c.travelRange) : prev.travelRange,
          ratePerDay: c.ratePerDay ? String(c.ratePerDay) : prev.ratePerDay,
          bio: c.bio || prev.bio,
          portfolioLink: c.portfolio || c.portfolioLink || prev.portfolioLink,
          email: c.email || u.email || prev.email,
          profileImage: c.profileImage || prev.profileImage,
        }));
        setLoading(false);
      },
    );
  }, [userPhone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setImageUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      );
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data },
      );
      const json = await res.json();
      if (json.secure_url) {
        setFormData((prev) => ({ ...prev, profileImage: json.secure_url }));
      } else {
        setError("Image upload failed. Please try again.");
      }
    } catch (err) {
      setError("Image upload failed: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.role) {
      setError("Role is required");
      return;
    }
    if (!formData.experience) {
      setError("Experience level is required");
      return;
    }
    if (!formData.city.trim()) {
      setError("City is required");
      return;
    }
    if (!formData.ratePerDay || parseFloat(formData.ratePerDay) <= 0) {
      setError("Rate per day is required");
      return;
    }

    setSaving(true);
    try {
      const phone = currentUser?.phoneNumber || userPhone;
      const result = await createCrewProfile(phone, formData);
      if (result.success) {
        router.push("/crew/dashboard");
      } else {
        setError(result.error || "Failed to save profile");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full bg-[#1E1E1E] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-500";
  const labelClass = "block text-zinc-300 text-sm font-medium mb-1.5";

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">Loading your profile…</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <div className="min-h-screen bg-[#0D0D0D]">
        <header className="border-b border-zinc-800 bg-[#111] px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-7 h-7 bg-[#F5A623] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-xs">CH</span>
            </div>
            <span className="text-white font-semibold">CrewHive</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold">
              Complete Your Profile
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Fields pre-filled from WhatsApp are editable. Phone number cannot
              be changed.
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                  {formData.profileImage ? (
                    <img
                      src={formData.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-zinc-500" />
                  )}
                </div>
                <label
                  htmlFor="profile-image-input"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#F5A623] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#E8960F] transition-colors shadow-lg"
                >
                  {imageUploading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-black" />
                  )}
                </label>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={imageUploading}
                />
              </div>
              <p className="text-zinc-500 text-xs">
                {imageUploading
                  ? "Uploading…"
                  : "Tap the camera icon to upload a photo"}
              </p>
            </div>

            {/* Phone — read-only */}
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                value={userPhone || currentUser?.phoneNumber || ""}
                readOnly
                className="w-full bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
              />
              <p className="text-zinc-600 text-xs mt-1">Cannot be changed</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input
                  list="cities-list"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Your city"
                  className={fieldClass}
                />
                <datalist id="cities-list">
                  {CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className={labelClass}>Primary Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="">Select your role…</option>
                {CREW_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Years of Experience *</label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="">Select experience level…</option>
                {EXPERIENCE_LEVELS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Rate per Day (₹) *</label>
                <input
                  type="number"
                  name="ratePerDay"
                  value={formData.ratePerDay}
                  onChange={handleChange}
                  placeholder="e.g. 3000"
                  min="0"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Travel Range (km)</label>
                <input
                  type="number"
                  name="travelRange"
                  value={formData.travelRange}
                  onChange={handleChange}
                  placeholder="e.g. 50"
                  min="0"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell organizers about your experience, specialties and work style…"
                rows={4}
                className={`${fieldClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>Portfolio Link</label>
              <input
                type="url"
                name="portfolioLink"
                value={formData.portfolioLink}
                onChange={handleChange}
                placeholder="https://your-portfolio.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email (optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 text-black font-semibold rounded-xl py-3 text-sm transition-colors mt-2"
            >
              {saving ? "Saving…" : "Save Profile →"}
            </button>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
