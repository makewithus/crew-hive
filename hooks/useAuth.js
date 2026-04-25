'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser } from '@/lib/firestore';

const AuthContext = createContext(null);

// Firestore doc ID = phone digits only
const phoneToDocId = (phone) => String(phone || '').replace(/\D/g, '');

// Check client-side if phone is the super admin (safe — admin phone is not a secret)
const isSuperAdminPhone = (phone) => {
  if (!phone) return false;
  const id = phoneToDocId(phone);
  const adminRaw = process.env.NEXT_PUBLIC_ADMIN_PHONES || '';
  const adminIds = adminRaw.split(',').map((p) => phoneToDocId(p.trim())).filter(Boolean);
  return adminIds.length > 0 && adminIds[0] === id;
};

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

          // Phone from Firebase Auth (OTP login) OR from custom token claims (admin PIN login)
          let phone = user.phoneNumber; // e.g. "+919876543210" — set for OTP users
          let claimsRole = null;
          if (!phone) {
            // Custom-token sign-in (admin PIN) — phone is in the JWT claims
            try {
              const idTokenResult = await user.getIdTokenResult();
              if (idTokenResult.claims?.phone) {
                phone = idTokenResult.claims.phone;
              }
              if (idTokenResult.claims?.role) {
                claimsRole = idTokenResult.claims.role;
              }
            } catch (_) {}
          }
          setUserPhone(phone);

          // Super admin via custom token claims — skip Firestore lookup
          if (claimsRole === 'super_admin') {
            setUserRole('super_admin');
            setUserApproved(true);
            setLoading(false);
            return;
          }

          if (phone) {
            // Super admin is determined by phone number (env var) — overrides Firestore role
            if (isSuperAdminPhone(phone)) {
              setUserRole('super_admin');
              setUserApproved(true);
            } else {
              const userResult = await getUser(phone);
              if (userResult.success) {
                const data = userResult.data;
                setUserRole(data.role ?? null);
                const isAdmin = data.role === 'super_admin';
                setUserApproved(isAdmin ? true : (data.approved ?? false));
              } else {
                setUserRole(null);
                setUserApproved(false);
              }
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
        console.error('[useAuth] Error:', err);
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
      console.error('[useAuth] Logout error:', err);
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
    isSuperAdmin: userRole === 'super_admin',
    isAdmin: userRole === 'super_admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default useAuth;
