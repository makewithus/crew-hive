'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOtp, fetchUserRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();

  // confirmationResult lives in lib/auth module scope — no local state needed
  useEffect(() => { /* mount guard — auth/phone must be visited first */ }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }

    setLoading(true);
    const verifyResult = await verifyOtp(otp);

    if (!verifyResult.success) {
      setLoading(false);
      setError(verifyResult.error);
      if (verifyResult.code === 'auth/code-expired' || verifyResult.code === 'auth/session-expired') {
        router.push('/auth/phone');
      }
      return;
    }

    try {
      const userData = await fetchUserRole(verifyResult.user.phoneNumber);
      const { role, approved } = userData;
      if (role === 'super_admin') { router.push('/super-admin/dashboard'); return; }
      if (role === 'admin') { router.push('/admin'); return; }
      if (role === 'crew') { router.push(approved ? '/crew/dashboard' : '/crew/verify'); return; }
      if (role === 'employer') { router.push(approved ? '/employer/dashboard' : '/crew/verify'); return; }
      router.push('/crew/setup');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to load profile. Please try again.');
    }
  };

  const handleResend = async () => {
    setResendTimer(60);
    setError('OTP resent to your phone number');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-foreground">CrewHive</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Verify OTP</h1>
          <p className="text-muted-foreground text-sm">Enter the 6-digit code sent to your phone</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                placeholder="000000"
                maxLength="6"
                className="w-full text-center text-3xl tracking-[0.6em] bg-muted border border-border text-foreground h-16 rounded-xl outline-none focus:border-primary/50 transition-colors font-bold"
              />

            </div>

            {error && (
              <div className={`flex gap-2.5 p-3.5 rounded-xl text-sm border ${
                error.includes('resent')
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || loading}
              className="w-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Didn't receive code? Resend"}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link href="/auth/phone" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Phone Entry
          </Link>
        </div>
      </div>
    </div>
  );
}
