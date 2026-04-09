'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getOrganizerProfile, getApprovedCrew, getOrganizerBookings } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { USER_ROLES } from '@/utils/constants';

export default function OrganizerDashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [organizer, setOrganizer] = useState(null);
  const [stats, setStats] = useState({ totalCrew: 0, availableCrew: 0, totalBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');

    try {
      const orgResult = await getOrganizerProfile(currentUser.uid);
      if (orgResult.success) {
        setOrganizer(orgResult.data);
      } else {
        setError('Profile not found. Please complete your setup.');
        setTimeout(() => router.push('/organizer/setup'), 2000);
        return;
      }

      const [crewResult, bookingsResult] = await Promise.all([
        getApprovedCrew(),
        getOrganizerBookings(currentUser.uid),
      ]);

      if (crewResult.success) {
        const availableCrew = crewResult.data.filter((c) => c.available).length;
        setStats({
          totalCrew: crewResult.data.length,
          availableCrew,
          totalBookings: bookingsResult.success ? bookingsResult.data.length : 0,
        });
      }
    } catch (err) {
      console.error('[v0] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {organizer?.name || 'Organizer'}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Total Crew Available</p>
              <p className="text-4xl font-bold text-foreground mt-2">{stats.totalCrew}</p>
              <p className="text-sm text-primary mt-2">{stats.availableCrew} available now</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Your Bookings</p>
              <p className="text-4xl font-bold text-primary mt-2">{stats.totalBookings}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Organization</p>
              <p className="text-lg font-bold text-foreground mt-2">{organizer?.companyName}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/organizer/search">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg">
                  Search for Crew
                </Button>
              </Link>
              <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted py-6 text-lg">
                View My Bookings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
