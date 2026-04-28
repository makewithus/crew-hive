"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext(null);

// Firestore doc ID = phone digits only
const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

// Role is always determined server-side via /api/auth/initialize — never client-side

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userApproved, setUserApproved] = useState(null); // null = loading
  const [userPhone, setUserPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);

          // Phone from Firebase Auth (OTP login) OR from custom token claims
          let phone = user.phoneNumber; // set for Firebase phone auth users
          let claimsRole = null;
          if (!phone) {
            // Custom-token sign-in — phone and role are in JWT claims
            try {
              const idTokenResult = await user.getIdTokenResult();
              if (idTokenResult.claims?.phone) {
                phone = idTokenResult.claims.phone;
              } else if (user.uid && /^\d{10,15}$/.test(user.uid)) {
                // Fallback: uid IS the phone digits for our custom token users
                phone = `+${user.uid}`;
              }
              if (idTokenResult.claims?.role) {
                claimsRole = idTokenResult.claims.role;
              }
            } catch (_) {}
          }
          setUserPhone(phone);

          // Super admin via custom token claims — skip Firestore lookup
          if (claimsRole === "super_admin") {
            setUserRole("super_admin");
            setUserApproved(true);
            setLoading(false);
            return;
          }

          if (phone) {
            // Always fetch role from server — server checks Firestore + SUPER_ADMIN_PHONE env
            try {
              const res = await fetch("/api/auth/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, checkOnly: true }),
              });
              if (res.ok) {
                const data = await res.json();
                const role =
                  data.role === "employer" ? "organizer" : (data.role ?? null);
                setUserRole(role);
                setUserApproved(
                  role === "super_admin" ? true : (data.approved ?? false),
                );
              } else {
                setUserRole(null);
                setUserApproved(false);
              }
            } catch {
              setUserRole(null);
              setUserApproved(false);
            }
          } else {
            setUserRole(null);
            setUserApproved(false);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setUserApproved(null);
          setUserPhone(null);
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
