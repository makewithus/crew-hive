'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, setupRecaptchaVerifier } from '@/lib/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';

// Popular country codes for dropdown
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationRef, setConfirmationRef] = useState(null);
  const recaptchaContainerRef = useRef(null);

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window._recaptchaVerifier) {
        try { window._recaptchaVerifier.clear(); } catch (_) {}
        window._recaptchaVerifier = null;
      }
    };
  }, []);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    const fullPhone = `${countryCode}${digits}`;
    setLoading(true);

    try {
      const verifier = setupRecaptchaVerifier('recaptcha-container');
      if (!verifier) throw new Error('reCAPTCHA setup failed. Please refresh.');

      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      // Store in memory (not state, to avoid serialization issues)
      window._confirmationResult = result;
      setConfirmationRef(true); // just a flag
      setStep('otp');
    } catch (err) {
      console.error('[Login] sendOtp error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
      // Clear verifier on error
      if (window._recaptchaVerifier) {
        try { window._recaptchaVerifier.clear(); } catch (_) {}
        window._recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length < 4) {
      setError('Please enter the OTP.');
      return;
    }

    const confirmation = window._confirmationResult;
    if (!confirmation) {
      setError('Session expired. Please request a new OTP.');
      setStep('phone');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(otp);
      const phone = userCredential.user.phoneNumber;

      // Initialize user role via server-side API
      const res = await fetch('/api/auth/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      window._confirmationResult = null;

      // Redirect based on role
      if (data.role === 'admin' || data.role === 'super_admin') {
        router.push('/admin');
      } else if (data.role === 'crew') {
        if (data.approved) {
          router.push('/crew/dashboard');
        } else {
          router.push('/crew/verify'); // pending approval
        }
      } else if (data.role === 'employer') {
        if (data.approved) {
          router.push('/employer/dashboard');
        } else {
          router.push('/crew/verify'); // pending approval (reuse page)
        }
      } else {
        // No role — user hasn't completed WhatsApp onboarding
        router.push('/crew/setup');
      }
    } catch (err) {
      console.error('[Login] verifyOtp error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP expired. Please request a new one.');
        setStep('phone');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#F5A623] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CH</span>
            </div>
            <span className="text-white text-xl font-bold">CrewHive</span>
          </div>
          <p className="text-zinc-400 text-sm">Professional crew for every production</p>
        </div>

        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-8">
          {step === 'phone' ? (
            <>
              <h1 className="text-white text-2xl font-semibold mb-1">Sign in</h1>
              <p className="text-zinc-400 text-sm mb-6">
                Enter your phone number to receive an OTP
              </p>

              <form onSubmit={sendOtp} className="space-y-4">
                {/* Phone input — country code + number separated */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Country Code
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#F5A623]"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} — {c.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="98765 43210"
                      className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                      autoFocus
                      inputMode="numeric"
                    />
                    <p className="text-zinc-600 text-xs mt-1.5">Enter without leading 0 or country code</p>
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 space-y-1">
                    <p>{error}</p>
                    {(error.includes('Blaze') || error.includes('test phone')) && (
                      <a
                        href="https://console.firebase.google.com/project/_/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-red-300 underline"
                      >
                        Open Firebase Console → Authentication
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>

              <p className="text-zinc-500 text-xs text-center mt-6">
                Don&#39;t have an account?{' '}
                <span className="text-[#F5A623]">
                  Message us on WhatsApp to register
                </span>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              <h1 className="text-white text-2xl font-semibold mb-1">Enter OTP</h1>
              <p className="text-zinc-400 text-sm mb-6">
                We sent a 6-digit code to{' '}
                <span className="text-white font-medium">
                  {countryCode} {phoneNumber}
                </span>
              </p>

              <form onSubmit={verifyOtp} className="space-y-4">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm text-center tracking-[0.4em] text-lg focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In →'}
                </button>
              </form>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs mt-4 transition-colors"
              >
                Resend OTP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
