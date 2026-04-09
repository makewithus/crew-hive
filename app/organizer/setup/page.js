'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createOrganizerProfile } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthGuard from '@/components/AuthGuard';
import { USER_ROLES } from '@/utils/constants';

export default function OrganizerSetupPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    city: '',
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

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }

    setLoading(true);

    try {
      console.log('[v0] Creating organizer profile...');
      const result = await createOrganizerProfile(currentUser.uid, formData);

      if (result.success) {
        console.log('[v0] Organizer profile created');
        router.push('/organizer/dashboard');
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
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              Tell us about your organization so you can start booking crew members
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="bg-card border border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company/Organization Name
              </label>
              <Input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Acme Productions"
                className="bg-card border border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                City
              </label>
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Los Angeles"
                className="bg-card border border-border text-foreground"
              />
            </div>

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
