'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createCrewProfile, getUser } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthGuard from '@/components/AuthGuard';
import { USER_ROLES } from '@/utils/constants';

const CREW_ROLES = [
  'Sound Engineer', 'Lighting Operator', 'LED Wall Tech', 'Stage Manager',
  'Rigger', 'Cinematographer', 'Photographer', 'Assistant Director', 'Editor', 'Drone Pilot',
];
const EXPERIENCE_LEVELS = ['0–2 years', '3–5 years', '5–10 years', '10+ years'];
const CITIES = ['Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur', 'Kannur', 'Kottayam', 'Malappuram', 'Palakkad', 'Alappuzha'];

export default function CrewSetupPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '', role: '', experience: '', city: '', travelRange: '',
    ratePerDay: '', bio: '', portfolioLink: '', email: '',
  });

  // Autofill from WhatsApp onboarding data
  useEffect(() => {
    if (!userPhone) return;
    setLoading(true);
    getUser(userPhone).then((result) => {
      if (result.success) {
        const d = result.data;
        setFormData((prev) => ({
          ...prev,
          name: d.name || d.data?.name || prev.name,
          role: d.crewRole || d.data?.crewRole || prev.role,
          experience: d.experience || d.data?.experience || prev.experience,
          city: d.city || d.data?.city || prev.city,
        }));
      }
      setLoading(false);
    });
  }, [userPhone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Name is required'); return; }
    if (!formData.role) { setError('Role is required'); return; }
    if (!formData.experience) { setError('Experience level is required'); return; }
    if (!formData.city.trim()) { setError('City is required'); return; }
    if (!formData.ratePerDay || parseFloat(formData.ratePerDay) <= 0) { setError('Rate per day is required'); return; }

    setSaving(true);
    try {
      const phone = currentUser?.phoneNumber || userPhone;
      const result = await createCrewProfile(phone, formData);
      if (result.success) {
        router.push('/crew/dashboard');
      } else {
        setError(result.error || 'Failed to save profile');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full bg-[#1E1E1E] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-500';
  const labelClass = 'block text-zinc-300 text-sm font-medium mb-1.5';

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
            <h1 className="text-white text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Fields pre-filled from WhatsApp are editable. Phone number cannot be changed.
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone — read-only */}
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                value={userPhone || currentUser?.phoneNumber || ''}
                readOnly
                className="w-full bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
              />
              <p className="text-zinc-600 text-xs mt-1">Cannot be changed</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input name="name" value={formData.name} onChange={handleChange}
                  placeholder="Your full name" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input list="cities-list" name="city" value={formData.city} onChange={handleChange}
                  placeholder="Your city" className={fieldClass} />
                <datalist id="cities-list">
                  {CITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className={labelClass}>Primary Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} className={fieldClass}>
                <option value="">Select your role…</option>
                {CREW_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Years of Experience *</label>
              <select name="experience" value={formData.experience} onChange={handleChange} className={fieldClass}>
                <option value="">Select experience level…</option>
                {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Rate per Day (₹) *</label>
                <input type="number" name="ratePerDay" value={formData.ratePerDay} onChange={handleChange}
                  placeholder="e.g. 3000" min="0" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Travel Range (km)</label>
                <input type="number" name="travelRange" value={formData.travelRange} onChange={handleChange}
                  placeholder="e.g. 50" min="0" className={fieldClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange}
                placeholder="Tell organizers about your experience, specialties and work style…"
                rows={4} className={`${fieldClass} resize-none`} />
            </div>

            <div>
              <label className={labelClass}>Portfolio Link</label>
              <input type="url" name="portfolioLink" value={formData.portfolioLink} onChange={handleChange}
                placeholder="https://your-portfolio.com" className={fieldClass} />
            </div>

            <div>
              <label className={labelClass}>Email (optional)</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="your@email.com" className={fieldClass} />
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 text-black font-semibold rounded-xl py-3 text-sm transition-colors mt-2">
              {saving ? 'Saving…' : 'Save Profile →'}
            </button>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
