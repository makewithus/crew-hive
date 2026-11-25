/**
 * components/SessionTimeoutManager.js
 * Comprehensive Session Inactivity & Auto-Logout Management
 *
 * Implements:
 * 1. Tracks user activity across pointer, touch, scroll, keyboard, and focus events.
 * 2. 10-minute inactivity threshold (600,000 ms).
 * 3. 5-second warning countdown modal asking "Are you still working?"
 * 4. Automatic logout and redirection to /login?reason=timeout if 5 seconds elapse with no response.
 * 5. Multi-tab synchronization via localStorage events (active in Tab A keeps Tab B alive).
 * 6. Bilingual Malayalam and English support.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Clock } from "lucide-react";
import { toast } from "sonner";

// Standard timeouts
const DEFAULT_INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const COUNTDOWN_SECONDS = 5; // 5 seconds prompt

const STORAGE_KEY_LAST_ACTIVE = "crewhive_last_active";
const STORAGE_KEY_LOGOUT = "crewhive_session_logout";

export default function SessionTimeoutManager() {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const { isMalayalam } = useLanguage();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const lastRecordedRef = useRef(Date.now());
  const countdownTimerRef = useRef(null);

  // Allow custom override in window for testing/debugging
  const getInactivityLimit = useCallback(() => {
    if (typeof window !== "undefined" && window.__CREWHIVE_INACTIVITY_TIMEOUT_MS) {
      return Number(window.__CREWHIVE_INACTIVITY_TIMEOUT_MS);
    }
    return DEFAULT_INACTIVITY_MS;
  }, []);

  // Record user activity
  const handleActivity = useCallback(() => {
    if (!currentUser) return;
    const now = Date.now();

    // Throttle localStorage writes to once every 2 seconds
    if (now - lastRecordedRef.current > 2000) {
      lastRecordedRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
      } catch (_) {}
    }
  }, [currentUser]);

  // Execute full logout
  const performLogout = useCallback(async () => {
    setShowWarning(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    try {
      localStorage.setItem(STORAGE_KEY_LOGOUT, Date.now().toString());
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
    } catch (_) {}

    await logout();

    toast.info(
      isMalayalam
        ? "10 മിനിറ്റ് പ്രവർത്തനമില്ലാത്തതിനാൽ ലോഗൗട്ട് ചെയ്തു."
        : "Logged out due to 10 minutes of inactivity."
    );

    router.push("/login?reason=timeout");
  }, [logout, isMalayalam, router]);

  // User explicitly acknowledges: "Yes, I'm still working"
  const handleStayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastRecordedRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
    } catch (_) {}

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setShowWarning(false);
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  // Lock viewport scroll when warning modal is open
  useEffect(() => {
    if (showWarning) {
      const origHtmlOverflow = document.documentElement.style.overflow;
      const origBodyOverflow = document.body.style.overflow;
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return () => {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [showWarning]);

  // Attach activity event listeners when authenticated
  useEffect(() => {
    if (!currentUser || !isAuthenticated) {
      setShowWarning(false);
      return;
    }

    // Initialize current active timestamp
    const now = Date.now();
    lastRecordedRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
    } catch (_) {}

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const onEvent = () => handleActivity();

    events.forEach((ev) => {
      window.addEventListener(ev, onEvent, { passive: true });
    });

    // Multi-tab synchronization
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
        const otherTabActive = parseInt(e.newValue, 10);
        lastRecordedRef.current = otherTabActive;
        // If another tab was active recently, close any warning dialog
        if (Date.now() - otherTabActive < getInactivityLimit()) {
          setShowWarning(false);
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
        }
      }
      if (e.key === STORAGE_KEY_LOGOUT) {
        // Logout triggered in another tab
        logout();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, onEvent);
      });
      window.removeEventListener("storage", onStorage);
    };
  }, [currentUser, isAuthenticated, handleActivity, getInactivityLimit, logout]);

  // Inactivity polling interval (checks every second)
  useEffect(() => {
    if (!currentUser || !isAuthenticated) return;

    const interval = setInterval(() => {
      if (showWarning) return; // Warning countdown handles its own loop

      const limit = getInactivityLimit();
      let lastActive = lastRecordedRef.current;

      try {
        const stored = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
        if (stored) {
          lastActive = Math.max(lastActive, parseInt(stored, 10));
        }
      } catch (_) {}

      const elapsed = Date.now() - lastActive;

      if (elapsed >= limit) {
        // Trigger 5-second warning countdown
        setShowWarning(true);
        setCountdown(COUNTDOWN_SECONDS);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, isAuthenticated, showWarning, getInactivityLimit]);

  // 5-second countdown loop when warning dialog is visible
  useEffect(() => {
    if (!showWarning) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showWarning, performLogout]);

  // If not logged in or no warning to display, render nothing
  if (!currentUser || !showWarning) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="timeout-title"
      aria-describedby="timeout-desc"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
    >
      <div className="bg-[#161616] border border-[#2E2E2E] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-200">
        {/* Top Warning Pulse Badge */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        {/* Heading */}
        <h2 id="timeout-title" className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {isMalayalam ? "നിങ്ങൾ ഇപ്പോഴും ജോലി ചെയ്യുകയാണോ?" : "Are you still working?"}
        </h2>

        {/* Description */}
        <p id="timeout-desc" className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {isMalayalam
            ? "10 മിനിറ്റായി പ്രവർത്തനമൊന്നുമില്ല. നിങ്ങളുടെ സുരക്ഷയ്ക്കായി താഴെ കാണുന്ന സമയത്തിനുള്ളിൽ ലോഗൗട്ട് ചെയ്യും:"
            : "You have been inactive for 10 minutes. For your security, you will be automatically logged out in:"}
        </p>

        {/* Visual Countdown Badge */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="text-5xl font-black font-mono text-amber-400 tracking-wider">
            00:0{countdown}
          </div>
          <div className="w-48 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={handleStayLoggedIn}
            className="flex-1 py-3 px-4 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            {isMalayalam ? "തുടരുക (I'm Still Working)" : "Yes, I'm still working"}
          </button>
          <button
            type="button"
            onClick={performLogout}
            className="py-3 px-4 bg-muted hover:bg-zinc-800 text-muted-foreground hover:text-foreground border border-border font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            {isMalayalam ? "ലോഗൗട്ട്" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
