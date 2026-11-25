"use client";

import { apiFetch } from "@/lib/api-client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext(null);

// Firestore doc ID = phone digits only
const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

// Role is always determined server-side via /api/auth/initialize — never client-side

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== "undefined") {
      try { return sessionStorage.getItem("crewhive_user_role") || null; } catch (_) {}
    }
    return null;
  });
  const [userApproved, setUserApproved] = useState(null); // null = loading
  const [userPhone, setUserPhone] = useState(() => {
    if (typeof window !== "undefined") {
      try { return sessionStorage.getItem("crewhive_user_phone") || null; } catch (_) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoleFromServer = async (phone) => {
    try {
      const res = await apiFetch("/api/auth/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, checkOnly: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const role = data.role === "employer" ? "organizer" : (data.role ?? null);
        setUserRole(role);
        setUserApproved(role === "super_admin" ? true : (data.approved ?? false));
        if (typeof window !== "undefined") {
          try {
            if (role) sessionStorage.setItem("crewhive_user_role", role);
            if (phone) sessionStorage.setItem("crewhive_user_phone", phone);
          } catch (_) {}
        }
        return { role, approved: data.approved };
      }
    } catch (_) {}
    return { role: null, approved: false };
  };

  const refreshUser = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    let phone = user.phoneNumber;
    let claimsRole = null;
    try {
      const idTokenResult = await user.getIdTokenResult(true);
      if (idTokenResult.claims?.phone) phone = idTokenResult.claims.phone;
      else if (user.uid && /^\d{10,15}$/.test(user.uid)) phone = `+${user.uid}`;
      if (idTokenResult.claims?.role) claimsRole = idTokenResult.claims.role;
    } catch (_) {}

    if (phone) setUserPhone(phone);
    if (claimsRole === "super_admin") {
      setUserRole("super_admin");
      setUserApproved(true);
      return { role: "super_admin", approved: true };
    }
    return fetchRoleFromServer(phone);
  };

  const updateUserRole = (role, approved = false) => {
    setUserRole(role);
    setUserApproved(approved);
    if (typeof window !== "undefined") {
      try {
        if (role) sessionStorage.setItem("crewhive_user_role", role);
      } catch (_) {}
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);

          // Phone from Firebase Auth (OTP login) OR from custom token claims
          let phone = user.phoneNumber;
          let claimsRole = null;
          if (!phone) {
            try {
              const idTokenResult = await user.getIdTokenResult();
              if (idTokenResult.claims?.phone) {
                phone = idTokenResult.claims.phone;
              } else if (user.uid && /^\d{10,15}$/.test(user.uid)) {
                phone = `+${user.uid}`;
              }
              if (idTokenResult.claims?.role) {
                claimsRole = idTokenResult.claims.role;
              }
            } catch (_) {}
          }
          if (phone) {
            setUserPhone(phone);
            if (typeof window !== "undefined") {
              try { sessionStorage.setItem("crewhive_user_phone", phone); } catch (_) {}
            }
          }

          // Super admin via custom token claims
          if (claimsRole === "super_admin") {
            setUserRole("super_admin");
            setUserApproved(true);
            setLoading(false);
            return;
          }

          if (phone) {
            await fetchRoleFromServer(phone);
          } else {
            setUserRole(null);
            setUserApproved(false);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setUserApproved(null);
          setUserPhone(null);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem("crewhive_user_role");
              sessionStorage.removeItem("crewhive_user_phone");
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("[useAuth] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserApproved(null);
      setUserPhone(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("crewhive_user_role");
          sessionStorage.removeItem("crewhive_user_phone");
        } catch (_) {}
      }
      return { success: true };
    } catch (err) {
      console.error("[useAuth] Logout error:", err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const value = {
    currentUser,
    userRole,
    userApproved,
    userPhone,
    loading,
    error,
    logout,
    refreshUser,
    updateUserRole,
    isAuthenticated: !!currentUser,
    isSuperAdmin: userRole === "super_admin",
    isAdmin: userRole === "super_admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default useAuth;
