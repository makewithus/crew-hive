'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/auth/phone', '/auth/verify-otp', '/auth/role-selection', '/crew/verify'];

export const AuthGuard = ({ children, requiredRole = null }) => {
  const { currentUser, userRole, userApproved, isAdmin, isSuperAdmin, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Not authenticated → login
    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }

    // Admin/super_admin bypasses approval + role checks
    if (isAdmin) return;

    // Not approved crew → stay on login (they get a toast there)
    if (userApproved === false && userRole === 'crew') {
      router.push('/login');
      return;
    }

    // Role mismatch → redirect to the correct dashboard
    if (requiredRole && userRole && userRole !== requiredRole) {
      if (userRole === 'crew') router.push('/crew/dashboard');
      else if (userRole === 'organizer' || userRole === 'employer') router.push('/organizer/dashboard');
      else if (userRole === 'admin') router.push('/admin');
      return;
    }
  }, [loading, isAuthenticated, currentUser, userRole, userApproved, isAdmin, isSuperAdmin, requiredRole, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!isAdmin && userApproved === false && userRole === 'crew') return null;
  if (requiredRole && userRole !== requiredRole && !isAdmin) return null;

  return children;
};

export default AuthGuard;
