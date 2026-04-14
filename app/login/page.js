'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendOtp, verifyOtp, fetchUserRole, isValidPhone } from '@/lib/auth';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1',  country: 'USA / Canada', flag: '🇺🇸' },
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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      try {
        if (typeof window !== 'undefined' && window._recaptchaVerifier) {
          window._recaptchaVerifier.clear();
          window._recaptchaVerifier = null;
        }
      } catch (_) {}
    };
  }, []);

  const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please enter a valid phone number (without country code).');
      return;
    }

    if (!isValidPhone(fullPhone)) {
      setError('Invalid phone number. Check country code and digits.');
      return;
    }

    setLoading(true);
    const result = await sendOtp(fullPhone);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setStep('otp');
    setInfo(`OTP sent to ${countryCode} ${digits}`);
  };

  // ── Step 2: Verify OTP → role redirect ─────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);

    const verifyResult = await verifyOtp(otp);

    if (!verifyResult.success) {
      setLoading(false);
      setError(verifyResult.error);
      // Expired — go back to phone step
      if (
        verifyResult.code === 'auth/code-expired' ||
        verifyResult.code === 'auth/session-expired'
      ) {
        setStep('phone');
        setOtp('');
      }
      return;
    }

    // OTP verified — fetch role
    try {
      const userData = await fetchUserRole(verifyResult.user.phoneNumber);

      if (userData.role === 'admin' || userData.role === 'super_admin') {
        router.replace('/admin');
      } else if (userData.role === 'crew') {
        router.replace(userData.approved ? '/crew/dashboard' : '/crew/verify');
      } else if (userData.role === 'employer') {
        router.replace(userData.approved ? '/employer/dashboard' : '/crew/verify');
      } else {
        // No WhatsApp onboarding done yet
        router.replace('/crew/setup');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to load profile. Please try again.');
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setInfo('');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      {/* Invisible reCAPTCHA mount point — must be in DOM */}
      <div id="recaptcha-container" />

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

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <>
              <h1 className="text-white text-2xl font-semibold mb-1">Sign in</h1>
              <p className="text-zinc-400 text-sm mb-6">
                Enter your phone number to receive an OTP
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="98765 43210"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                  <p className="text-zinc-600 text-xs mt-1.5">Without leading 0 or country code</p>
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? <Spinner text="Sending OTP…" /> : 'Send OTP →'}
                </button>
              </form>

              <p className="text-zinc-500 text-xs text-center mt-6">
                Don&#39;t have an account?{' '}
                <span className="text-[#F5A623]">Message us on WhatsApp to register</span>
              </p>
            </>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <>
              <button
                onClick={handleBack}
                className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              <h1 className="text-white text-2xl font-semibold mb-1">Enter OTP</h1>
              <p className="text-zinc-400 text-sm mb-6">
                {info || `Code sent to ${countryCode} ${phone}`}
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                    autoComplete="one-time-code"
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? <Spinner text="Verifying…" /> : 'Verify & Sign In →'}
                </button>
              </form>

              <button
                onClick={handleBack}
                disabled={loading}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs mt-4 transition-colors disabled:opacity-50"
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBox({ message }) {
  const isSetupIssue =
    message.includes('Blaze') || message.includes('test phone') || message.includes('not enabled');

  return (
    <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 space-y-1">
      <p>{message}</p>
      {isSetupIssue && (
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
  );
}

function Spinner({ text }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {text}
    </span>
  );
}
