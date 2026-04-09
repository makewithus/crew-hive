'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createCrewProfile } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CREW_ROLES, EXPERIENCE_LEVELS } from '@/utils/constants';
import AuthGuard from '@/components/AuthGuard';
import { USER_ROLES } from '@/utils/constants';

export default function CrewSetupPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    experience: '',
    city: '',
    travelRange: '',
    ratePerDay: '',
    bio: '',
    portfolioLink: '',
    email: currentUser?.email || '',
    profileImage: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.role) {
      setError('Role is required');
      return;
    }
    if (!formData.experience) {
      setError('Experience level is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }
    if (!formData.travelRange || parseFloat(formData.travelRange) <= 0) {
      setError('Travel range must be greater than 0');
      return;
    }
    if (!formData.ratePerDay || parseFloat(formData.ratePerDay) <= 0) {
      setError('Rate must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      console.log('[v0] Creating crew profile...');
      const result = await createCrewProfile(currentUser.uid, formData);

      if (result.success) {
        console.log('[v0] Crew profile created');
        router.push('/crew/dashboard');
      } else {
        setError(result.error || 'Failed to create profile');
      }
    } catch (err) {
      console.error('[v0] Setup error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              Tell us about yourself so organizers can find the right crew for their projects
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-4 py-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Professional Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-card border border-border rounded text-foreground"
              >
                <option value="">Select a role</option>
                {CREW_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Experience Level
              </label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-card border border-border rounded text-foreground"
              >
                <option value="">Select level</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                City
              </label>
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., New York"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Travel Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Travel Range (km)
              </label>
              <Input
                type="number"
                name="travelRange"
                value={formData.travelRange}
                onChange={handleChange}
                placeholder="50"
                min="0"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Rate Per Day */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Rate Per Day (USD)
              </label>
              <Input
                type="number"
                name="ratePerDay"
                value={formData.ratePerDay}
                onChange={handleChange}
                placeholder="500"
                min="0"
                step="0.01"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about your experience and skills..."
                rows="4"
                className="w-full px-4 py-2 bg-card border border-border rounded text-foreground resize-none"
              ></textarea>
            </div>

            {/* Portfolio Link */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Portfolio Link (Optional)
              </label>
              <Input
                type="url"
                name="portfolioLink"
                value={formData.portfolioLink}
                onChange={handleChange}
                placeholder="https://your-portfolio.com"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email (Optional)
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="bg-card border border-border text-foreground"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-3 rounded transition"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
