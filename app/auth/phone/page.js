'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOtp } from '@/lib/auth';
import Link from 'next/link';

const COUNTRY_CODES = [
  { code: '91', label: '🇮🇳 +91', country: 'India' },
  { code: '1', label: '🇺🇸 +1', country: 'USA / Canada' },
  { code: '44', label: '🇬🇧 +44', country: 'UK' },
  { code: '971', label: '🇦🇪 +971', country: 'UAE' },
  { code: '65', label: '🇸🇬 +65', country: 'Singapore' },
  { code: '60', label: '🇲🇾 +60', country: 'Malaysia' },
  { code: '61', label: '🇦🇺 +61', country: 'Australia' },
  { code: '49', label: '🇩🇪 +49', country: 'Germany' },
  { code: '33', label: '🇫🇷 +33', country: 'France' },
  { code: '81', label: '🇯🇵 +81', country: 'Japan' },
];

export default function PhoneAuthPage() {
  const [countryCode, setCountryCode] = useState('91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setPhoneNumber(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    const result = await sendOtp(`+${countryCode}${digits}`);
    setLoading(false);

    if (result.success) {
      router.push('/auth/verify-otp');
    } else {
      setError(result.error || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-foreground">CrewHive</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sign in with your registered phone number.<br />
            <span className="text-primary font-medium">Not registered yet?</span> Start on WhatsApp first.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country code */}
                <div className="flex-shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-14 bg-muted border border-border text-foreground rounded-xl px-3 text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Phone number */}
                <div className="flex-1 flex items-center bg-muted rounded-xl border border-border focus-within:border-primary/50 transition-colors px-4 h-14">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="98765 43210"
                    maxLength="12"
                    inputMode="numeric"
                    autoFocus
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select your country code, then enter your number without the leading 0
              </p>
            </div>

            {error && (
              <div className="flex flex-col gap-1 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <span>{error}</span>
                {(error.includes('not enabled') || error.includes('Blaze') || error.includes('test phone')) && (
                  <a
                    href="https://console.firebase.google.com/project/_/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 underline mt-1 font-medium"
                  >
                    → Firebase Console → Authentication → Sign-in method
                  </a>
                )}
                {(error.includes('Authorized domains') || error.includes('domain') || error.includes('internal error')) && (
                  <a
                    href="https://console.firebase.google.com/project/_/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 underline mt-1 font-medium"
                  >
                    → Firebase Console → Authentication → Settings → Authorized domains
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phoneNumber.length < 10}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Sending OTP…
                </span>
              ) : 'Send OTP'}
            </button>
          </form>

          <div id="recaptcha-container" className="mt-4" />
        </div>

        {/* Chatbot notice */}
        <div className="mt-6 flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <span className="text-2xl">💬</span>
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">New to CrewHive?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your profile must be created via WhatsApp first. After admin approval, you can sign in here.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
