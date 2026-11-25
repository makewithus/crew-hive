"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth/phone",
  "/auth/verify-otp",
  "/auth/role-selection",
  "/crew/verify",
];

export const AuthGuard = ({ children, requiredRole = null }) => {
  const {
    currentUser,
    userRole: authUserRole,
    userApproved,
    isAdmin,
    isSuperAdmin,
    loading,
    isAuthenticated,
    refreshUser,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Read role with fallback to sessionStorage if auth state is still resolving
  const userRole =
    authUserRole ||
    (typeof window !== "undefined" ? sessionStorage.getItem("crewhive_user_role") : null);

  useEffect(() => {
    if (loading) return;

    // Not authenticated → login
    if (!isAuthenticated || !currentUser) {
      router.push("/login");
      return;
    }

    // Admin/super_admin bypasses approval + role checks
    if (isAdmin) return;

    // If authenticated but userRole is missing, attempt to refresh role from server
    if (requiredRole && !userRole && refreshUser) {
      refreshUser().then((res) => {
        if (!res?.role) {
          // If no profile exists yet, redirect to onboarding
          if (requiredRole === "crew") router.push("/crew/onboarding");
          else if (requiredRole === "organizer") router.push("/recruiter/register");
        }
      });
      return;
    }

    // Role mismatch → redirect to the correct dashboard
    if (requiredRole && userRole && userRole !== requiredRole) {
      if (userRole === "crew") router.push("/crew/dashboard");
      else if (userRole === "organizer" || userRole === "employer")
        router.push("/organizer/dashboard");
      else if (userRole === "admin") router.push("/admin");
      return;
    }
  }, [
    loading,
    isAuthenticated,
    currentUser,
    userRole,
    userApproved,
    isAdmin,
    isSuperAdmin,
    requiredRole,
    router,
    pathname,
    refreshUser,
  ]);

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

  // If authenticated but userRole is still resolving, show loader instead of blank screen
  if (requiredRole && !userRole && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && userRole && userRole !== requiredRole && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
