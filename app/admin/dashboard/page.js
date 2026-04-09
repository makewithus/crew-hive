'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPendingCrew, getApprovedCrew } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { USER_ROLES } from '@/utils/constants';

export default function AdminDashboardPage() {
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, [currentUser]);

  const loadStats = async () => {
    setLoading(true);
    setError('');

    try {
      const [pendingResult, approvedResult] = await Promise.all([
        getPendingCrew(),
        getApprovedCrew(),
      ]);

      if (pendingResult.success && approvedResult.success) {
        setStats({
          pending: pendingResult.data.length,
          approved: approvedResult.data.length,
          total: pendingResult.data.length + approvedResult.data.length,
        });
      } else {
        setError('Failed to load statistics');
      }
    } catch (err) {
      console.error('[v0] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  if (userRole !== USER_ROLES.ADMIN && !loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ADMIN}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-red-700">Unauthorized access</p>
        </div>
      </AuthGuard>
    );
  }

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ADMIN}>
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
    <AuthGuard requiredRole={USER_ROLES.ADMIN}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage crew approvals and platform statistics</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Total Registered Crew</p>
              <p className="text-4xl font-bold text-foreground mt-2">{stats.total}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Approved Crew</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Pending Approvals</p>
              <p className="text-4xl font-bold text-primary mt-2">{stats.pending}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.pending === 0 ? 'All caught up!' : 'Action required'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Management</h2>
            <Link href="/admin/approvals" className="block">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg">
                Review Pending Approvals ({stats.pending})
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
