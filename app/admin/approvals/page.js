'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateCrewProfile, subscribeToPendingCrew } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { USER_ROLES } from '@/utils/constants';

export default function AdminApprovalsPage() {
  const { currentUser, userRole } = useAuth();
  const [crews, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Real-time listener — auto-updates when crew status changes
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = subscribeToPendingCrew((result) => {
      if (result.success) {
        setCrew(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleApproval = async (crewId, approve) => {
    setUpdatingId(crewId);
    setError('');

    try {
      const newStatus = approve ? 'approved' : 'rejected';
      const result = await updateCrewProfile(crewId, { status: newStatus });

      if (result.success) {
        setCrew((prev) => prev.filter((c) => c.uid !== crewId));
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[v0] Update error:', err);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

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
            <h1 className="text-3xl font-bold text-foreground">Crew Approvals</h1>
            <p className="text-muted-foreground mt-2">Review and approve pending crew profiles</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {crews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No pending approvals</p>
              <p className="text-muted-foreground">All crew profiles have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {crews.map((crew) => (
                <div key={crew.uid} className="p-6 bg-card border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{crew.name}</h3>
                      <p className="text-primary font-medium">{crew.role}</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Applied {formatDate(crew.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={crew.status} type="crew" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-t border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="font-medium text-foreground">{crew.experience}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{crew.city}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Travel Range</p>
                      <p className="font-medium text-foreground">{crew.travelRange} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rate/Day</p>
                      <p className="font-medium text-foreground">{formatCurrency(crew.ratePerDay)}</p>
                    </div>
                  </div>

                  {crew.bio && (
                    <div className="mb-6 p-4 bg-muted rounded">
                      <p className="text-xs text-muted-foreground mb-1">Bio</p>
                      <p className="text-sm text-foreground">{crew.bio}</p>
                    </div>
                  )}

                  {crew.portfolioLink && (
                    <div className="mb-6">
                      <a
                        href={crew.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/90 text-sm font-medium"
                      >
                        View Portfolio →
                      </a>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproval(crew.uid, true)}
                      disabled={updatingId === crew.uid}
                      className="flex-1 bg-green-600 text-white hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApproval(crew.uid, false)}
                      disabled={updatingId === crew.uid}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
