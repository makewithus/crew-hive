'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { currentUser, isSuperAdmin, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) { router.push('/auth/phone'); return; }
    if (!isSuperAdmin) { router.push('/'); return; }

    const fetchStats = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success) setStats(result.data);
      } catch (err) {
        console.error('[SuperAdmin] stats fetch error:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [loading, currentUser, isSuperAdmin, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
        { label: 'Pending Approval', value: stats.pendingApproval, icon: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
        { label: 'Approved Users', value: stats.approvedUsers, icon: '✅', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
        { label: 'Total Crew', value: stats.totalCrew, icon: '🎬', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
        { label: 'Approved Crew', value: stats.approvedCrew, icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
        { label: 'Organizers', value: stats.organizers, icon: '📋', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
        { label: 'Pending Crew', value: stats.pendingCrew, icon: '🔄', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
        { label: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-foreground">CrewHive</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30 ml-1">
              SUPER ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/users"
              className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              Manage Users
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-1">Super Admin Portal</h1>
          <p className="text-muted-foreground">Platform overview and user management</p>
        </div>

        {/* Stat grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {statCards.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/super-admin/users"
            className="group bg-card border border-border hover:border-primary/50 rounded-2xl p-6 transition-all hover:bg-primary/5"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-foreground font-bold mb-1">Manage Users</h3>
            <p className="text-muted-foreground text-sm">Approve or revoke access for crew & organizers</p>
            {stats?.pendingApproval > 0 && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                {stats.pendingApproval} pending
              </span>
            )}
          </Link>

          <Link
            href="/admin/approvals"
            className="group bg-card border border-border hover:border-primary/50 rounded-2xl p-6 transition-all hover:bg-primary/5"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
              <span className="text-2xl">🎬</span>
            </div>
            <h3 className="text-foreground font-bold mb-1">Crew Approvals</h3>
            <p className="text-muted-foreground text-sm">Review and approve crew member applications</p>
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-foreground font-bold mb-1">Platform Stats</h3>
            <p className="text-muted-foreground text-sm">
              {stats
                ? `${stats.totalUsers} users · ${stats.totalBookings} bookings`
                : 'Loading…'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
