'use client';

import { useState, useEffect, useCallback } from 'react';
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
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) { showToast('error', 'Please enter a valid phone number (without country code).'); return; }

    if (!isValidPhone(fullPhone)) { showToast('error', 'Invalid phone number. Check country code and digits.'); return; }

    setLoading(true);

    try {
      const checkRes = await fetch('/api/auth/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, checkOnly: true }),
      });
      const checkData = await checkRes.json();

      if (!checkData.exists && checkData.role !== 'super_admin') {
        setLoading(false);
        showToast('error', 'Number not found. Please register via WhatsApp first.');
        return;
      }
      if (checkData.approved === false && checkData.role != null) {
        setLoading(false);
        showToast('error', 'Admin has not approved yet. Please try again later.');
        return;
      }
    } catch (_) {}

    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (!result.success) { showToast('error', result.error); return; }
    setStep('otp');
    showToast('info', `OTP sent to ${countryCode} ${digits}`);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { showToast('error', 'Please enter the 6-digit OTP.'); return; }
    setLoading(true);

    const verifyResult = await verifyOtp(otp);
    if (!verifyResult.success) {
      setLoading(false);
      showToast('error', verifyResult.error);
      if (verifyResult.code === 'auth/code-expired' || verifyResult.code === 'auth/session-expired') {
        setStep('phone'); setOtp('');
      }
      return;
    }

    try {
      const userData = await fetchUserRole(verifyResult.phone || verifyResult.user.phoneNumber);
      if (userData.role === 'super_admin') { router.replace('/super-admin/dashboard'); }
      else if (userData.role === 'crew') {
        if (!userData.approved) {
          setLoading(false);
          showToast('error', "Your profile is pending approval. You'll be notified on WhatsApp once approved.");
          return;
        }
        router.replace('/crew/dashboard');
      } else if (userData.role === 'organizer' || userData.role === 'employer') {
        router.replace('/organizer/dashboard');
      } else {
        showToast('error', 'Profile not found. Please register via WhatsApp first.');
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      showToast('error', err.message || 'Failed to load profile. Please try again.');
    }
  };

  const handleBack = () => { setStep('phone'); setOtp(''); };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div id="recaptcha-container" style={{ display: 'none' }} />

      {toast && (
        <div className={`fixed top-5 right-5 z-50 max-w-sm w-full px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-start gap-3 border ${
          toast.type === 'error'
            ? 'bg-red-950/95 border-red-800 text-red-200'
            : toast.type === 'success'
            ? 'bg-green-950/95 border-green-800 text-green-200'
            : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
        }`}>
          <span className="mt-0.5 text-base leading-none">
            {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 shrink-0 ml-1">✕</button>
        </div>
      )}

      <div className="w-full max-w-md">
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
          {step === 'phone' && (
            <>
              <h1 className="text-white text-2xl font-semibold mb-1">Sign in</h1>
              <p className="text-zinc-400 text-sm mb-6">Enter your registered phone number</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Country Code</label>
                  <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#F5A623]">
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Phone Number</label>
                  <input type="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="98765 43210"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus inputMode="numeric" autoComplete="tel" />
                  <p className="text-zinc-600 text-xs mt-1.5">Without leading 0 or country code</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <Spinner text="Checking…" /> : 'Send OTP →'}
                </button>
              </form>
              <p className="text-zinc-500 text-xs text-center mt-6">
                No account?{' '}
                <a href="https://wa.me/918139002826?text=Hi" target="_blank" rel="noopener noreferrer"
                  className="text-[#F5A623] hover:underline">Register on WhatsApp</a>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              <button onClick={handleBack}
                className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
                ← Back
              </button>
              <h1 className="text-white text-2xl font-semibold mb-1">Enter OTP</h1>
              <p className="text-zinc-400 text-sm mb-6">Code sent to {countryCode} {phone}</p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Verification Code</label>
                  <input type="text" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-lg text-center tracking-[0.4em] focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <Spinner text="Verifying…" /> : 'Verify & Sign In →'}
                </button>
              </form>
              <button onClick={handleBack} disabled={loading}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs mt-4 transition-colors disabled:opacity-50">
                Resend OTP
              </button>
            </>
          )}
        </div>
      </div>
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
