'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function PendingApprovalPage() {
  const { currentUser, userRole, userApproved, isSuperAdmin, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // If not logged in, go to phone auth
    if (!currentUser) {
      router.push('/auth/phone');
      return;
    }
    // If already approved, go to the right dashboard
    if (userApproved === true || isSuperAdmin) {
      if (userRole === 'crew') router.push('/crew/dashboard');
      else if (userRole === 'organizer') router.push('/organizer/dashboard');
      else if (userRole === 'admin') router.push('/admin/dashboard');
      else if (userRole === 'super_admin') router.push('/super-admin/dashboard');
    }
  }, [loading, currentUser, userApproved, isSuperAdmin, userRole, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const roleLabel = userRole === 'crew' ? 'Crew Member' : userRole === 'organizer' ? 'Organizer' : 'User';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-foreground">CrewHive</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Status icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            Awaiting Approval
          </h1>
          <p className="text-muted-foreground text-center mb-8 leading-relaxed">
            Your <span className="text-primary font-medium">{roleLabel}</span> profile has been registered
            and is currently under review by our super admin team.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {[
              { icon: '✅', label: 'WhatsApp Registration', done: true },
              { icon: '✅', label: 'Profile Saved to Firebase', done: true },
              { icon: '⏳', label: 'Super Admin Verification', done: false },
              { icon: '🔒', label: 'Web Access Unlocked', done: false },
            ].map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  step.done
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className={`text-sm font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {step.done && (
                  <span className="ml-auto text-xs text-primary font-semibold">Done</span>
                )}
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className="flex gap-3 bg-muted/40 rounded-xl p-4 mb-6">
            <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your profile data collected via WhatsApp is securely stored. Once our admin approves your account,
              you'll be able to sign in and access your dashboard immediately.
            </p>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
          >
            Sign Out
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions? Reach us on WhatsApp or contact support.
        </p>
      </div>
    </div>
  );
}
